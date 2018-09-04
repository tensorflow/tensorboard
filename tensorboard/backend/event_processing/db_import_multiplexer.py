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
# ===========================================================================
"""A loading-only EventMultiplexer that actually populates a SQLite DB."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import threading
import time

import six
from six.moves import queue, xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.backend.event_processing import directory_watcher
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.backend.event_processing import io_wrapper


class DbImportMultiplexer(object):
  """A loading-only `EventMultiplexer` that populates a SQLite DB.

  This EventMultiplexer only loads data; it provides no read APIs.
  """

  def __init__(self,
               db_connection_provider,
               purge_orphaned_data=True,
               max_reload_threads=1):
    """Constructor for `DbImportMultiplexer`.

    Args:
      db_connection_provider: Provider function for creating a DB connection.
      purge_orphaned_data: Whether to discard any events that were "orphaned" by
        a TensorFlow restart.
      max_reload_threads: The max number of threads that TensorBoard can use
        to reload runs. Each thread reloads one run at a time. If not provided,
        reloads runs serially (one after another).
    """
    tf.logging.info('DbImportMultiplexer initializing');
    conn = db_connection_provider()
    # Extract the file path of the DB from the DB connection.
    rows = conn.execute('PRAGMA database_list;').fetchall()
    tf.logging.info('Got rows %s', type(rows))
    db_name_to_path = {row[1]: row[2] for row in rows}
    self._db_path = db_name_to_path['main']
    tf.logging.info('DbImportMultiplexer using db_path %s', self._db_path)
    # Set the DB in WAL mode so reads don't block writes.
    # TODO(nickfelt): investigate weird errors in rollback journal mode
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA synchronous=NORMAL;')  # Recommended for WAL mode
    self._run_importers = {}
    self.purge_orphaned_data = purge_orphaned_data
    if self.purge_orphaned_data:
      tf.logging.warning(
          '--db_import does not yet support purging orphaned data')
    self._max_reload_threads = max_reload_threads
    if self._max_reload_threads > 1:
      tf.logging.warning(
          '--db_import does not yet support more than one reload thread')
    tf.logging.info('DbImportMultiplexer done initializing')

  def AddRunsFromDirectory(self, path, name=None):
    """Load runs from a directory; recursively walks subdirectories.

    If path doesn't exist, no-op. This ensures that it is safe to call
      `AddRunsFromDirectory` multiple times, even before the directory is made.

    Args:
      path: A string path to a directory to load runs from.
      name: Optional, specifies a name for the experiment under which the
        runs from this directory hierarchy will be imported. If omitted, the
        path will be used as the name.

    Raises:
      ValueError: If the path exists and isn't a directory.
    """
    tf.logging.info('Starting AddRunsFromDirectory: %s (as %s)', path, name)
    for subdir in io_wrapper.GetLogdirSubdirectories(path):
      tf.logging.info('Processing directory %s', subdir)
      if subdir not in self._run_importers:
        tf.logging.info('Creating DB importer for directory %s', subdir)
        self._run_importers[subdir] = _RunImporter(
            db_path=self._db_path,
            subdir=subdir,
            experiment_name=(name or path),
            run_name=os.path.relpath(subdir, path))
    tf.logging.info('Done with AddRunsFromDirectory: %s', path)

  def Reload(self):
    """Call `Import` on every run to import."""
    tf.logging.info('Beginning DbImportMultiplexer.Reload()')
    items_queue = queue.Queue()
    for item in six.iteritems(self._run_importers):
      items_queue.put(item)

    # Methods of built-in python containers are thread-safe so long as the GIL
    # for the thread exists, but we might as well be careful.
    names_to_delete = set()
    names_to_delete_mutex = threading.Lock()

    def Worker():
      """Keeps importing runs until none are left."""
      while True:
        try:
          name, importer = items_queue.get(block=False)
        except queue.Empty:
          # No more runs to reload.
          break

        try:
          start = time.time()
          importer.Import()
          elapsed = time.time() - start
          tf.logging.debug('importer.Import() took %0.3f sec', elapsed)
        except (OSError, IOError) as e:
          tf.logging.error('Unable to import run %r: %s', name, e)
        except directory_watcher.DirectoryDeletedError:
          with names_to_delete_mutex:
            names_to_delete.add(name)
        finally:
          items_queue.task_done()

    if self._max_reload_threads > 1:
      num_threads = min(
          self._max_reload_threads, len(self._run_importers))
      tf.logging.info('Starting %d threads to import runs', num_threads)
      for i in xrange(num_threads):
        thread = threading.Thread(target=Worker, name='Importer %d' % i)
        thread.daemon = True
        thread.start()
      items_queue.join()
    else:
      tf.logging.info('Importing runs serially on the main thread')
      Worker()

    for name in names_to_delete:
      tf.logging.warning('Deleting importer %r', name)
      del self._run_importers[name]
    tf.logging.info('Finished with DbImportMultiplexer.Reload()')
    return self


class _RunImporter(object):
  """Helper class to import a single run directory into the sqlite DB."""

  def __init__(self, db_path, subdir, experiment_name, run_name):
    """Constructs a `_RunImporter` and initializes a DB run.

    Args:
      db_path: string, filesystem path of the DB file to open
      subdir: string, filesystem path of the run directory
      experiment_name: string, name of the run's experiment
      run_name: string, name of the run
    """
    self._directory_generator = directory_watcher.DirectoryWatcher(
        subdir,
        event_file_loader.RawEventFileLoader,
        io_wrapper.IsTensorFlowEventsFile)
    with tf.Graph().as_default():
      self._placeholder = tf.placeholder(shape=[], dtype=tf.string)
      writer = tf.contrib.summary.create_db_writer(
          db_path, experiment_name=experiment_name, run_name=run_name)
      with writer.as_default():
        # TODO(nickfelt): running import_event() one record at a time is very
        #   slow; we should add an op that accepts a vector of records.
        self._import_op = tf.contrib.summary.import_event(self._placeholder)
      self._session = tf.Session()
      self._session.run(writer.init())

  def Import(self):
    """Imports all events added since the last call to `Import`."""
    for record in self._directory_generator.Load():
      self._session.run(self._import_op, feed_dict={self._placeholder: record})
