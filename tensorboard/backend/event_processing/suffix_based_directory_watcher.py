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

"""Contains the implementation for the SuffixBasedDirectoryWatcher class."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import re
import time

import tensorflow as tf


from tensorboard.backend.event_processing import io_wrapper

# The watcher will close any event files with last event times this many seconds
# before the current time. Closed event files will never be read from again.
# This preserves too many file handlers from being open.
_MAX_INACTIVE_AGE = 86400


class SuffixHead(object):
  def __init__(self, path, loader_factory):
    """Stores resources for the head of a suffix.

    This directory watcher maintains a file loader for the current events file
    being read from for each suffix. The idea is that each suffix could be
    written by a different Writer.

    This construct stores information on the current events file being read for
    some suffix.

    Args:
      path: The path to the events file to create a suffix head for.
    """
    self.path = path

    # The loader used to read from this events file.
    self.loader = loader_factory(path)

    # The wall time (timestamp) of the last event read from this file. None if
    # no event has been read yet from this file.
    self.last_event_time = None


class SuffixBasedDirectoryWatcher(object):
  """A DirectoryWatcher wraps a loader to load from a sequence of paths.

  This watcher watches all the paths inside that directory for new events to
  read. It supports multiple SummaryWriters writing to the same run so long as
  the summary writers

  (1) differ in events file name suffix.
  (2) write events that do not share the same tags across writers.

  This directory watcher groups events files based on their suffixes. For each
  suffix, the watcher reads from a current events file (the suffix head). The
  watcher reads events files by order of timestamp (parsed from the file name)
  and suffix.

  The watcher closes events files (and never reads from them again) if either
  (1) The last recorded event for a file has a timestamp over _MAX_INACTIVE_AGE
      seconds ago.
  (2) There is an events file with the same suffix that comes later in the
      ordering.

  TODO(chihuahua): Make the watcher periodically scan closed events files
  within the _MAX_INACTIVE_AGE time frame. Log a warning if they are updated.

  The watcher ambushed the Fellowship as they entered the darkness of Moria.
  """

  def __init__(self, directory, loader_factory, path_filter=lambda x: True):
    """Constructs a new SuffixBasedDirectoryWatcher.

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
    self._path = None
    self._loader_factory = loader_factory
    self._loader = None
    self._path_filter = path_filter

    # A mapping between the name of an events file and its SuffixHead.
    self.suffix_to_head = {}

    # A set of paths that are closed and will never be read from again.
    self._closed_paths = set()

  def Load(self):
    """Loads new values.

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
      if not tf.gfile.Exists(self._directory):
        raise DirectoryDeletedError(
            'Directory %s has been permanently deleted' % self._directory)

  def _LoadInternal(self):
    """Internal implementation of Load().

    Yields:
      All values that have not been yielded yet.
    """
    while True:
      # Used to determine whether we should keep obtaining new directory
      # listings. We only do so if we picked up new events to read.
      at_least_1_event_read = False

      # Sort event file names by timestamp (at which it was written) and then
      # suffix.
      paths = [path
               for path in io_wrapper.ListDirectoryAbsolute(self._directory)
               if self._path_filter(path) and path not in self._closed_paths]
      paths.sort()

      # Map from suffix to the index of the last events file with that suffix.
      # Used later to determine whether to close an events file - we close the
      # file if a subsequent file with the same suffix exists.
      suffix_to_last_file_index = {}
      for (i, path) in enumerate(paths):
        suffix = self._ParseSuffix(path)
        if not suffix:
          continue
        suffix_to_last_file_index[suffix] = i

      while True:
        # Whether any event has been read from any of the files within the
        # current file listing.
        at_least_1_event_read_for_current_paths = False

        for (i, path) in enumerate(paths):
          if path in self._closed_paths:
            # Never again read from closed files.
            continue

          # Parse the suffix from the name of the events file.
          suffix = self._ParseSuffix(path)
          if not suffix:
            tf.logging.info(
                'File %r does not match events file naming pattern', path)
            continue

          if suffix not in self.suffix_to_head:
            # Read this file. This file has not been read from before.
            head = self._CreateNewHead(suffix, path)
          elif path < self.suffix_to_head[suffix].path:
            tf.logging.error(
                ('Events file %r is out of order since it is ordered behind '
                 '%r. It will not be read.'),
                path,
                self.suffix_to_head[suffix].path)
            continue
          else:
            # Keep reading from the head of the current suffix. It still has
            # more events to read.
            head = self.suffix_to_head[suffix]

          # Yield all remaining events for this suffix.
          last_event = None
          for event in head.loader.Load():
            last_event = event
            yield event

          if last_event:
            at_least_1_event_read_for_current_paths = True
            at_least_1_event_read = True
            head.last_event_time = last_event.wall_time

          # Close this file if either at least 1 events file (with the same
          # suffix) comes after this events file or its last recorded event
          # timestamp is old.
          if (suffix_to_last_file_index[suffix] > i or (
              head.last_event_time is not None and
              head.last_event_time + _MAX_INACTIVE_AGE < time.time())):
            self._closed_paths.add(path)
            del self.suffix_to_head[suffix]

          if last_event:
            # We read to the end of a file. Start cycling through the paths
            # again, but do not yet obtain a new file listing.
            break

        if not at_least_1_event_read_for_current_paths:
          # No files were read. Obtain a new file listing and try reading from
          # events again.
          break

      if not at_least_1_event_read:
        # No events files were read. We have tried updating the file listing.
        # Stop checking. Await the next TensorBoard backend reload.
        break


  def _CreateNewHead(self, suffix, path):
    """Creates a new head for a suffix.

    This method thus begins reading from a new events file for a given suffix.
    Updates internal state.

    Args:
      suffix: The suffix string.
      path: The path to the next events file to read for the suffix.

    Returns:
      The new SuffixHead.
    """
    if suffix in self.suffix_to_head:
      # Close the previous events file being read for this suffix.
      self._closed_paths.add(path)
      del self.suffix_to_head[suffix]

    # Create a new head. Loaders lack a Close method. We rely on python garbage
    # collecting its file handler.
    self.suffix_to_head[suffix] = SuffixHead(path, self._loader_factory)
    return self.suffix_to_head[suffix]

  def _ParseSuffix(self, path):
    """Parses the suffix.

    Args:
      path: The path to an events file.

    Returns:
      A string that is the suffix. Or none if the pattern does not match.
    """
    match = re.search(r'events\.out\.tfevents\.\d+\.(.*)$', path)
    return match.group(1) if match else None


class DirectoryDeletedError(Exception):
  """Thrown by Load() when the directory is *permanently* gone.

  We distinguish this from temporary errors so that other code can decide to
  drop all of our data only when a directory has been intentionally deleted,
  as opposed to due to transient filesystem errors.
  """
  pass
