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

import abc
import collections
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
    db_name_to_path = {row[1]: row[2] for row in rows}
    self._db_path = db_name_to_path['main']
    tf.logging.info('DbImportMultiplexer using db_path %s', self._db_path)
    # Set the DB in WAL mode so reads don't block writes.
    # TODO(nickfelt): investigate weird errors in rollback journal mode
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA synchronous=NORMAL;')  # Recommended for WAL mode
    self._run_loaders = {}
    self._event_sink = _ImportOpEventSink(self._db_path)
    self.purge_orphaned_data = purge_orphaned_data
    if self.purge_orphaned_data:
      tf.logging.warning(
          '--db_import does not yet support purging orphaned data')
    self._max_reload_threads = max_reload_threads
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
      if subdir not in self._run_loaders:
        tf.logging.info('Creating DB loader for directory %s', subdir)
        self._run_loaders[subdir] = _RunLoader(
            subdir=subdir,
            experiment_name=(name or path),
            run_name=os.path.relpath(subdir, path))
    tf.logging.info('Done with AddRunsFromDirectory: %s', path)

  def Reload(self):
    """Load events from every detected run."""
    tf.logging.info('Beginning DbImportMultiplexer.Reload()')
    # Use collections.deque() for speed when we don't need blocking since it
    # also has thread-safe appends/pops.
    loader_queue = collections.deque(six.itervalues(self._run_loaders))
    loader_delete_queue = collections.deque()

    def batch_generator():
      while True:
        try:
          loader = loader_queue.popleft()
        except IndexError:
          return
        try:
          for batch in loader.load_batches():
            yield batch
        except directory_watcher.DirectoryDeletedError:
          loader_delete_queue.append(loader)
        except (OSError, IOError) as e:
          tf.logging.error('Unable to load run %r: %s', loader.subdir, e)

    num_threads = min(self._max_reload_threads, len(self._run_loaders))
    if num_threads <= 1:
      tf.logging.info('Importing runs serially on a single thread')
      for batch in batch_generator():
        self._event_sink.write_batch(batch)
    else:
      output_queue = queue.Queue()
      sentinel = object()
      def producer():
        try:
          for batch in batch_generator():
            output_queue.put(batch)
        finally:
          output_queue.put(sentinel)
      tf.logging.info('Starting %d threads to import runs', num_threads)
      for i in xrange(num_threads):
        thread = threading.Thread(target=producer, name='Loader %d' % i)
        thread.daemon = True
        thread.start()
      num_live_threads = num_threads
      while num_live_threads > 0:
        output = output_queue.get()
        if output == sentinel:
          num_live_threads -= 1
          continue
        self._event_sink.write_batch(output)
    for loader in loader_delete_queue:
      tf.logging.warning('Deleting loader %r', loader.subdir)
      del self._run_loaders[loader.subdir]
    tf.logging.info('Finished with DbImportMultiplexer.Reload()')


# Struct holding a list of tf.Event serialized protos along with metadata about
# the associated experiment and run.
_EventBatch = collections.namedtuple('EventBatch',
                                     ['events', 'experiment_name', 'run_name'])


class _RunLoader(object):
  """Loads a single run directory in batches."""

  _BATCH_COUNT = 5000
  _BATCH_BYTES = 2**20  # 1 MB

  def __init__(self, subdir, experiment_name, run_name):
    """Constructs a `_RunLoader`.

    Args:
      subdir: string, filesystem path of the run directory
      experiment_name: string, name of the run's experiment
      run_name: string, name of the run
    """
    self._subdir = subdir
    self._experiment_name = experiment_name
    self._run_name = run_name
    self._directory_watcher = directory_watcher.DirectoryWatcher(
        subdir,
        event_file_loader.RawEventFileLoader,
        io_wrapper.IsTensorFlowEventsFile)

  @property
  def subdir(self):
    return self._subdir

  def load_batches(self):
    """Returns a batched event iterator over the run directory event files."""
    event_iterator = self._directory_watcher.Load()
    while True:
      events = []
      event_bytes = 0
      start = time.time()
      for event_proto in event_iterator:
        events.append(event_proto)
        event_bytes += len(event_proto)
        if len(events) >= self._BATCH_COUNT or event_bytes >= self._BATCH_BYTES:
          break
      elapsed = time.time() - start
      tf.logging.debug('RunLoader.load_batch() yielded in %0.3f sec', elapsed)
      if not events:
        return
      yield _EventBatch(
          events=events,
          experiment_name=self._experiment_name,
          run_name=self._run_name)


class _EventSink(object):
  """Abstract sink for batches of serialized tf.Event data."""
  __metaclass__ = abc.ABCMeta

  @abc.abstractmethod
  def write_batch(self, event_batch):
    """Writes the given event batch to the sink.

    Args:
      event_batch: an _EventBatch of event data.
    """
    raise NotImplementedError()


class _ImportOpEventSink(_EventSink):
  """Implementation of EventSink using TF's import_event() op."""

  def __init__(self, db_path):
    """Constructs an ImportOpEventSink.

    Args:
      db_path: string, filesystem path of the DB file to open
    """
    self._db_path = db_path
    self._writer_fn_cache = {}

  def _get_writer_fn(self, event_batch):
    key = (event_batch.experiment_name, event_batch.run_name)
    if key in self._writer_fn_cache:
      return self._writer_fn_cache[key]
    with tf.Graph().as_default():
      placeholder = tf.placeholder(shape=[], dtype=tf.string)
      writer = tf.contrib.summary.create_db_writer(
          self._db_path,
          experiment_name=event_batch.experiment_name,
          run_name=event_batch.run_name)
      with writer.as_default():
        # TODO(nickfelt): running import_event() one record at a time is very
        #   slow; we should add an op that accepts a vector of records.
        import_op = tf.contrib.summary.import_event(placeholder)
      session = tf.Session()
      session.run(writer.init())
      def writer_fn(event_proto):
        session.run(import_op, feed_dict={placeholder: event_proto})
    self._writer_fn_cache[key] = writer_fn
    return writer_fn

  def write_batch(self, event_batch):
    start = time.time()
    writer_fn = self._get_writer_fn(event_batch)
    for event_proto in event_batch.events:
      writer_fn(event_proto)
    elapsed = time.time() - start
    tf.logging.debug(
        'ImportOpEventSink.WriteBatch() took %0.3f sec for %s events', elapsed,
        len(event_batch.events))
