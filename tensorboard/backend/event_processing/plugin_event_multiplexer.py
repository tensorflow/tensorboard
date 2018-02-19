# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Provides an interface for working with multiple event files."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import os
import threading

import numpy as np
import six
import tensorflow as tf

from tensorboard.backend.event_processing import directory_watcher
from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import io_wrapper


class EventMultiplexer(object):
  """An `EventMultiplexer` manages access to multiple `EventAccumulator`s.

  Each `EventAccumulator` is associated with a `run`, which is a self-contained
  TensorFlow execution. The `EventMultiplexer` provides methods for extracting
  information about events from multiple `run`s.

  Example usage for loading specific runs from files:

  ```python
  x = EventMultiplexer({'run1': 'path/to/run1', 'run2': 'path/to/run2'})
  x.Reload()
  ```

  Example usage for loading a directory where each subdirectory is a run

  ```python
  (eg:) /parent/directory/path/
        /parent/directory/path/run1/
        /parent/directory/path/run1/events.out.tfevents.1001
        /parent/directory/path/run1/events.out.tfevents.1002

        /parent/directory/path/run2/
        /parent/directory/path/run2/events.out.tfevents.9232

        /parent/directory/path/run3/
        /parent/directory/path/run3/events.out.tfevents.9232
  x = EventMultiplexer().AddRunsFromDirectory('/parent/directory/path')
  (which is equivalent to:)
  x = EventMultiplexer({'run1': '/parent/directory/path/run1', 'run2':...}
  ```

  If you would like to watch `/parent/directory/path`, wait for it to be created
    (if necessary) and then periodically pick up new runs, use
    `AutoloadingMultiplexer`
  @@Tensors
  """

  def __init__(self,
               run_path_map=None,
               size_guidance=None,
               tensor_size_guidance=None,
               purge_orphaned_data=True,
               db_connection_provider=None):
    """Constructor for the `EventMultiplexer`.

    Args:
      run_path_map: Dict `{run: path}` which specifies the
        name of a run, and the path to find the associated events. If it is
        None, then the EventMultiplexer initializes without any runs.
      size_guidance: A dictionary mapping from `tagType` to the number of items
        to store for each tag of that type. See
        `event_accumulator.EventAccumulator` for details.
      tensor_size_guidance: A dictionary mapping from `plugin_name` to
        the number of items to store for each tag of that type. See
        `event_accumulator.EventAccumulator` for details.
      purge_orphaned_data: Whether to discard any events that were "orphaned" by
        a TensorFlow restart.
      db_connection_provider: Function taking no arguments that returns a
          PEP-249 database Connection object, or None if multiplexer should be
          used instead. The returned value must be closed, and is safe to use in
          a `with` statement. It is also safe to assume that calling this
          function is cheap. The returned connection must only be used by a
          single thread. Things like connection pooling are considered
          implementation details of the provider. If provided, no events files
          are read.
    """
    tf.logging.info('Event Multiplexer initializing.')
    self._accumulators_mutex = threading.Lock()
    self._accumulators = {}
    self._paths = {}
    self._reload_called = False
    self._size_guidance = (size_guidance or
                           event_accumulator.DEFAULT_SIZE_GUIDANCE)
    self._tensor_size_guidance = tensor_size_guidance
    self.purge_orphaned_data = purge_orphaned_data
    self._db_connection_provider = db_connection_provider

    if self._db_connection_provider is None:
      # Only add runs if we are reading data from events files.
      if run_path_map is not None:
        tf.logging.info('Event Multplexer doing initialization load for %s',
                        run_path_map)
        for (run, path) in six.iteritems(run_path_map):
          self.AddRun(path, run)
    tf.logging.info('Event Multiplexer done initializing')

  def AddRun(self, path, name=None):
    """Add a run to the multiplexer.

    If the name is not specified, it is the same as the path.

    If a run by that name exists, and we are already watching the right path,
      do nothing. If we are watching a different path, replace the event
      accumulator.

    If `Reload` has been called, it will `Reload` the newly created
    accumulators.

    Args:
      path: Path to the event files (or event directory) for given run.
      name: Name of the run to add. If not provided, is set to path.

    Raises:
      RuntimeError: If this method is called while running in database mode.

    Returns:
      The `EventMultiplexer`.
    """
    if self._db_connection_provider:
      raise RuntimeError('Tried to add a run while in database mode.')

    name = name or path
    accumulator = None
    with self._accumulators_mutex:
      if name not in self._accumulators or self._paths[name] != path:
        if name in self._paths and self._paths[name] != path:
          # TODO(@dandelionmane) - Make it impossible to overwrite an old path
          # with a new path (just give the new path a distinct name)
          tf.logging.warning('Conflict for name %s: old path %s, new path %s',
                             name, self._paths[name], path)
        tf.logging.info('Constructing EventAccumulator for %s', path)
        accumulator = event_accumulator.EventAccumulator(
            path,
            size_guidance=self._size_guidance,
            tensor_size_guidance=self._tensor_size_guidance,
            purge_orphaned_data=self.purge_orphaned_data)
        self._accumulators[name] = accumulator
        self._paths[name] = path
    if accumulator:
      if self._reload_called:
        accumulator.Reload()
    return self

  def AddRunsFromDirectory(self, path, name=None):
    """Load runs from a directory; recursively walks subdirectories.

    If path doesn't exist, no-op. This ensures that it is safe to call
      `AddRunsFromDirectory` multiple times, even before the directory is made.

    If path is a directory, load event files in the directory (if any exist) and
      recursively call AddRunsFromDirectory on any subdirectories. This mean you
      can call AddRunsFromDirectory at the root of a tree of event logs and
      TensorBoard will load them all.

    If the `EventMultiplexer` is already loaded this will cause
    the newly created accumulators to `Reload()`.
    Args:
      path: A string path to a directory to load runs from.
      name: Optionally, what name to apply to the runs. If name is provided
        and the directory contains run subdirectories, the name of each subrun
        is the concatenation of the parent name and the subdirectory name. If
        name is provided and the directory contains event files, then a run
        is added called "name" and with the events from the path.

    Raises:
      ValueError: If the path exists and isn't a directory.
      RuntimeError: If this method is called while running in database mode.

    Returns:
      The `EventMultiplexer`.
    """
    if self.IsInDatabaseMode():
      raise RuntimeError('Tried to add runs while in database mode.')

    tf.logging.info('Starting AddRunsFromDirectory: %s', path)
    for subdir in GetLogdirSubdirectories(path):
      tf.logging.info('Adding run from directory %s', subdir)
      rpath = os.path.relpath(subdir, path)
      subname = os.path.join(name, rpath) if name else rpath
      self.AddRun(subdir, name=subname)
    tf.logging.info('Done with AddRunsFromDirectory: %s', path)
    return self

  def Reload(self):
    """Call `Reload` on every `EventAccumulator`.
    
    Raises:
      RuntimeError: If this method is called while running in database mode.
    """
    if self.IsInDatabaseMode():
      raise RuntimeError('Tried to reload while in database mode.')

    tf.logging.info('Beginning EventMultiplexer.Reload()')
    self._reload_called = True
    # Build a list so we're safe even if the list of accumulators is modified
    # even while we're reloading.
    with self._accumulators_mutex:
      items = list(self._accumulators.items())

    names_to_delete = set()
    for name, accumulator in items:
      try:
        accumulator.Reload()
      except (OSError, IOError) as e:
        tf.logging.error("Unable to reload accumulator '%s': %s", name, e)
      except directory_watcher.DirectoryDeletedError:
        names_to_delete.add(name)

    with self._accumulators_mutex:
      for name in names_to_delete:
        tf.logging.warning("Deleting accumulator '%s'", name)
        del self._accumulators[name]
    tf.logging.info('Finished with EventMultiplexer.Reload()')
    return self

  def PluginAssets(self, plugin_name):
    """Get index of runs and assets for a given plugin.

    Args:
      plugin_name: Name of the plugin we are checking for.

    Raises:
      RuntimeError: If this method is called while running in database mode.

    Returns:
      A dictionary that maps from run_name to a list of plugin
        assets for that run.
    """
    if self.IsInDatabaseMode():
      raise RuntimeError('Tried to retrieve assets while in database mode.')

    with self._accumulators_mutex:
      # To avoid nested locks, we construct a copy of the run-accumulator map
      items = list(six.iteritems(self._accumulators))

    return {run: accum.PluginAssets(plugin_name) for run, accum in items}

  def RetrievePluginAsset(self, run, plugin_name, asset_name):
    """Return the contents for a specific plugin asset from a run.

    Args:
      run: The string name of the run.
      plugin_name: The string name of a plugin.
      asset_name: The string name of an asset.

    Returns:
      The string contents of the plugin asset.

    Raises:
      KeyError: If the asset is not available.
      RuntimeError: If this method is called while running in database mode.
    """
    if self.IsInDatabaseMode():
      raise RuntimeError('Tried to retrieve assets while in database mode.')

    accumulator = self.GetAccumulator(run)
    return accumulator.RetrievePluginAsset(plugin_name, asset_name)

  def FirstEventTimestamp(self, run):
    """Return the timestamp of the first event of the given run.

    This may perform I/O if no events have been loaded yet for the run.

    Args:
      run: A string name of the run for which the timestamp is retrieved.

    Returns:
      The wall_time of the first event of the run, which will typically be
      seconds since the epoch.

    Raises:
      KeyError: If the run is not found.
      ValueError: If the run has no events loaded and there are no events on
        disk to load.
    """
    if self.IsInDatabaseMode():
      db = self._db_connection_provider()
      cursor = db.execute(
          'SELECT started_time FROM Runs WHERE run_name = ?', (run,))
      row = cursor.fetchone()
      if not row:
        raise KeyError('No run named %r could be found' % run)
      return row[0]

    accumulator = self.GetAccumulator(run)
    return accumulator.FirstEventTimestamp()

  def Scalars(self, run, tag):
    """Retrieve the scalar events associated with a run and tag.

    Args:
      run: A string name of the run for which values are retrieved.
      tag: A string name of the tag for which values are retrieved.

    Raises:
      KeyError: If the run is not found, or the tag is not available for
        the given run.

    Returns:
      An array of `event_accumulator.ScalarEvents`.
    """
    accumulator = self.GetAccumulator(run)
    return accumulator.Scalars(tag)

  def Graph(self, run):
    """Retrieve the graph associated with the provided run.

    Args:
      run: A string name of a run to load the graph for.

    Raises:
      KeyError: If the run is not found.
      ValueError: If the run does not have an associated graph.

    Returns:
      The `GraphDef` protobuf data structure.
    """
    accumulator = self.GetAccumulator(run)
    return accumulator.Graph()

  def MetaGraph(self, run):
    """Retrieve the metagraph associated with the provided run.

    Args:
      run: A string name of a run to load the graph for.

    Raises:
      KeyError: If the run is not found.
      ValueError: If the run does not have an associated graph.

    Returns:
      The `MetaGraphDef` protobuf data structure.
    """
    accumulator = self.GetAccumulator(run)
    return accumulator.MetaGraph()

  def RunMetadata(self, run, tag):
    """Get the session.run() metadata associated with a TensorFlow run and tag.

    Args:
      run: A string name of a TensorFlow run.
      tag: A string name of the tag associated with a particular session.run().

    Raises:
      KeyError: If the run is not found, or the tag is not available for the
        given run.

    Returns:
      The metadata in the form of `RunMetadata` protobuf data structure.
    """
    accumulator = self.GetAccumulator(run)
    return accumulator.RunMetadata(tag)

  def Audio(self, run, tag):
    """Retrieve the audio events associated with a run and tag.

    Args:
      run: A string name of the run for which values are retrieved.
      tag: A string name of the tag for which values are retrieved.

    Raises:
      KeyError: If the run is not found, or the tag is not available for
        the given run.

    Returns:
      An array of `event_accumulator.AudioEvents`.
    """
    accumulator = self.GetAccumulator(run)
    return accumulator.Audio(tag)

  def Tensors(self, run, tag):
    """Retrieve the tensor events associated with a run and tag.

    Args:
      run: A string name of the run for which values are retrieved.
      tag: A string name of the tag for which values are retrieved.

    Raises:
      KeyError: If the run is not found, or the tag is not available for
        the given run.

    Returns:
      An array of `event_accumulator.TensorEvent`s.
    """
    if not self.IsInDatabaseMode():
      # Return data read from events files.
      accumulator = self.GetAccumulator(run)
      return accumulator.Tensors(tag)

    # Read a database.
    db = self._db_connection_provider()
    cursor = db.execute(
        ('SELECT '
         'Tensors.computed_time, Tensors.data, Tensors.shape, Tensors.step, '
         'Tensors.dtype, Tags.tag_name '
         'FROM Tensors '
         'LEFT JOIN Tags ON Tensors.series=Tags.tag_id '
         'LEFT JOIN Runs ON Tags.run_id=Runs.run_id '
         'WHERE Tensors.step > -1 '
         'AND Runs.run_name = ? '
         'AND Tags.tag_name = ? '),
        (run, tag))
    tensor_events = []
    for row in cursor:
      wall_time, data, shape, step, dtype, tag = row
      tensorflow_dtype = tf.DType(dtype)
      buf = np.frombuffer(data, dtype=tensorflow_dtype.as_numpy_dtype)
      tensor_proto = tf.make_tensor_proto(
          values=buf,
          shape=[int(dim) for dim in (shape or '').split(',') if dim],
          dtype=tensorflow_dtype)
      tensor_event = event_accumulator.TensorEvent(
          wall_time=wall_time,
          step=step,
          tensor_proto=tensor_proto)
      tensor_events.append(tensor_event)
    return tensor_events

  def PluginRunToTagToContent(self, plugin_name):
    """Returns a 2-layer dictionary of the form {run: {tag: content}}.

    The `content` referred above is the content field of the PluginData proto
    for the specified plugin within a Summary.Value proto.

    Args:
      plugin_name: The name of the plugin for which to fetch content.

    Returns:
      A dictionary of the form {run: {tag: content}}.
    """
    if not self.IsInDatabaseMode():
      mapping = {}
      for run in self.Runs():
        try:
          tag_to_content = self.GetAccumulator(run).PluginTagToContent(
              plugin_name)
        except KeyError:
          # This run lacks content for the plugin. Try the next run.
          continue
        mapping[run] = tag_to_content
      return mapping

    mapping = collections.defaultdict(dict)
    db = self._db_connection_provider()
    cursor = db.execute(
        ('SELECT '
         'Runs.run_name, Tags.tag_name, Tags.plugin_data '
         'FROM Tags '
         'LEFT JOIN Runs ON Tags.run_id=Runs.run_id '
         'WHERE Tags.plugin_name = ? '),
        (plugin_name,))
    for row in cursor:
      # How do we interpret blobs?
      run, tag, plugin_data = row
      plugin_data = tf.SummaryMetadata.PluginData()
      self._ConvertBlobToPluginData(plugin_data, plugin_data)
      mapping[run][tag] = plugin_data.content

    return mapping

  def SummaryMetadata(self, run, tag):
    """Return the summary metadata for the given tag on the given run.

    Args:
      run: A string name of the run for which summary metadata is to be
        retrieved.
      tag: A string name of the tag whose summary metadata is to be
        retrieved.

    Raises:
      KeyError: If the run is not found, or the tag is not available for
        the given run.

    Returns:
      A `tf.SummaryMetadata` protobuf.
    """
    if not self.IsInDatabaseMode():
      accumulator = self.GetAccumulator(run)
      return accumulator.SummaryMetadata(tag)

    db = self._db_connection_provider()
    cursor = db.execute(
        ('SELECT '
         'Tags.display_name, Tags.plugin_data '
         'FROM Tags '
         'LEFT JOIN Runs ON Tags.run_id=Runs.run_id '
         'WHERE Runs.run_name = ? '
         'AND Tags.tag_name = ? '),
         (run, tag))
    row = cursor.fetchone()
    if not row:
      raise KeyError('No metadata for run %r and tag %r found' % (run, tag))
    display_name, plugin_data_bytes = row
    summary_metadata = tf.SummaryMetadata(
      display_name=display_name)
    self._ConvertBlobToPluginData(
        summary_metadata.plugin_data, plugin_data_bytes)
    # TODO(chihuahua): Figure out how descriptions are stored.
    return summary_metadata

  def _ConvertBlobToPluginData(self, plugin_data_proto, plugin_data_blob):
    """Converts a blob to a plugin data proto.
    
    Args:
      plugin_data_proto: The PluginData proto to merge data into.
      plugin_data_blob: A blob containing binary plugin data.
    """
    data = str(plugin_data_blob).encode('hex')
    plugin_data_proto.ParseFromString(tf.compat.as_bytes(data))

  def Runs(self):
    """Return all the run names in the `EventMultiplexer`.

    Returns:
    ```
      {runName: { scalarValues: [tagA, tagB, tagC],
                  graph: true, meta_graph: true}}
    ```
    """
    if not self.IsInDatabaseMode():
      with self._accumulators_mutex:
        # To avoid nested locks, we construct a copy of the run-accumulator map
        items = list(six.iteritems(self._accumulators))
      return {run_name: accumulator.Tags() for run_name, accumulator in items}

    db = self._db_connection_provider()
    cursor = db.execute(
        ('SELECT '
         'Runs.run_name, Tags.tag_name '
         'FROM Tags '
         'LEFT JOIN Runs ON Tags.run_id=Runs.run_id '))
    mapping = collections.defaultdict(lambda : collections.defaultdict(list))
    for row in cursor:
      run, tag = row
      if not run or not tag:
        continue

      mapping[run][event_accumulator.TENSORS].append(tag)
    return mapping

  def RunPaths(self):
    """Returns a dict mapping run names to event file paths."""
    return self._paths

  def GetAccumulator(self, run):
    """Returns EventAccumulator for a given run.

    Args:
      run: String name of run.

    Returns:
      An EventAccumulator object.

    Raises:
      KeyError: If run does not exist.
      RuntimeError: If this method is called while running in database mode.
    """
    if self.IsInDatabaseMode():
      raise RuntimeError('Tried to get accumulator while in database mode.')

    with self._accumulators_mutex:
      return self._accumulators[run]

  def IsInDatabaseMode(self):
    """Returns whether the multiplexer operates in database mode.
    
    If so, no event files are read from disk.
    """
    return bool(self._db_connection_provider)


def GetLogdirSubdirectories(path):
  """Returns subdirectories with event files on path."""
  if tf.gfile.Exists(path) and not tf.gfile.IsDirectory(path):
    raise ValueError('GetLogdirSubdirectories: path exists and is not a '
                     'directory, %s' % path)

  # ListRecursively just yields nothing if the path doesn't exist.
  return (
      subdir
      for (subdir, files) in io_wrapper.ListRecursively(path)
      if list(filter(event_accumulator.IsTensorFlowEventsFile, files))
  )
