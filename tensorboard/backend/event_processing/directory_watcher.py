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

"""Contains the implementation for the DirectoryWatcher class."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from google3.third_party.tensorboard.backend.event_processing import io_wrapper
from google3.third_party.tensorboard.compat import tf
from google3.third_party.tensorboard.util import tb_logging


logger = tb_logging.get_logger()


class _EventPathLoader(object):
  """Simple wrapper for loading events from a path."""

  def __init__(self, path, loader_factory):
    self._path = path
    self._next_event = None
    self._loader = loader_factory(path)

  def _NextEventStep(self):
    if not self._next_event:
      return int(1e30)
    return self._next_event.step

  def _NextEventWallTime(self):
    if not self._next_event:
      return int(1e30)
    return self._next_event.wall_time

  def NextEventSortKey(self):
    """Sort by step, then secondarily by wall time."""
    return (self._NextEventStep(), self._NextEventWallTime())

  def PopNextEvent(self):
    """Pops the next event. Must call PrepareNextEvent() first."""
    next_event = self._next_event
    self._next_event = None
    return next_event

  def PrepareNextEvent(self):
    """Loads the next event. Returns True if it was successfully loaded."""
    if not self._next_event:
      self._next_event = next(self._loader.Load(), None)
    return self._next_event is not None


# The number of paths before the current one to check for out of order writes.
_OOO_WRITE_CHECK_COUNT = 20


class DirectoryWatcher(object):
  """A DirectoryWatcher wraps a loader to load from a sequence of paths.

  A loader reads a path and produces some kind of values as an iterator. A
  DirectoryWatcher takes a directory, a factory for loaders, and optionally a
  path filter and watches all the paths inside that directory.

  This class returns events from multiple files, preferring to return events
  with smaller step counts first.
  """

  def __init__(self, directory, loader_factory, path_filter=lambda x: True):
    """Constructs a new DirectoryWatcher.

    Args:
      directory: The directory to load files from.
      loader_factory: A factory for creating loaders. The factory should take a
        path and return an object that has a Load method returning an
        iterator that will yield all events that have not been yielded yet.
      path_filter: If specified, only paths matching this filter are loaded.

    Raises:
      ValueError: If path_provider or loader_factory are None.
    """
    if directory is None:
      raise ValueError('A directory is required')
    if loader_factory is None:
      raise ValueError('A loader factory is required')
    self._directory = directory
    # Dict from path name to _EventPathLoader.
    self._paths = {}
    self._loader_factory = loader_factory
    self._path_filter = path_filter
    self._ooo_writes_detected = False
    # Step and walltime of previous writes, ordered from earlier events to
    # later events.
    self._previous_writes = []

  def Load(self):
    """Loads new values.

    The watcher will load from multiple paths, preferring to return events
    with smaller step counts earlier.

    Yields:
      All values that have not been yielded yet.

    Raises:
      DirectoryDeletedError: If the directory has been permanently deleted
        (as opposed to being temporarily unavailable).
    """
    try:
      for event in self._LoadInternal():
        yield event
    except tf.errors.OpError:
      if not tf.io.gfile.exists(self._directory):
        raise DirectoryDeletedError(
            'Directory %s has been permanently deleted' % self._directory)

  def _LoadInternal(self):
    """Internal implementation of Load().

    The only difference between this and Load() is that the latter will throw
    DirectoryDeletedError on I/O errors if it thinks that the directory has been
    permanently deleted.

    Yields:
      All values that have not been yielded yet.
    """
    self._LoadNewPaths()
    if not self._paths:
      raise StopIteration

    while True:
      # Yield all the new events in the paths we're currently loading from.
      self._LoadNewPaths()
      valid_paths = []
      for path in self._paths.values():
        if path.PrepareNextEvent():
          valid_paths.append(path)
      if not valid_paths:
        logger.info('No new events available in any paths.')
        return
      next_path = min(
          valid_paths,
          key=lambda p: p.NextEventSortKey())
      next_event_key = next_path.NextEventSortKey()
      next_event = next_path.PopNextEvent()
      for previous_write in self._previous_writes:
        if previous_write > next_event_key:
          self._ooo_writes_detected = True
      self._previous_writes.append(next_event_key)
      if len(self._previous_writes) > _OOO_WRITE_CHECK_COUNT:
        self._previous_writes.pop(0)
      yield next_event

  def OutOfOrderWritesDetected(self):
    """Returns whether any out-of-order writes have been detected.

    Out-of-order writes are only checked as part of the Load() iterator. Once an
    out-of-order write is detected, this function will always return true.

    Returns:
      Whether any out-of-order write has ever been detected by this watcher.

    """
    return self._ooo_writes_detected

  def _LoadNewPaths(self):
    """Checks the directory for any new paths that may have been created.

    Loads them into self._paths.
    """
    paths = sorted(path
                   for path in io_wrapper.ListDirectoryAbsolute(self._directory)
                   if self._path_filter(path))
    for path in paths:
      if path not in self._paths:
        logger.info('New path detected: %s.' % path)
        self._paths[path] = _EventPathLoader(path, self._loader_factory)


class DirectoryDeletedError(Exception):
  """Thrown by Load() when the directory is *permanently* gone.

  We distinguish this from temporary errors so that other code can decide to
  drop all of our data only when a directory has been intentionally deleted,
  as opposed to due to transient filesystem errors.
  """
  pass
