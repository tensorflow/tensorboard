# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

"""TensorBoard testing helper routine module.

This module is basically a dumpster for really generic succinct helper
routines that exist solely for test code.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from absl import logging
import contextlib
import functools
import os
import sqlite3
import threading

import tensorflow as tf

from tensorboard import db
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import meta_graph_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.util import tb_logging
from tensorboard.util import util

logger = tb_logging.get_logger()


class TestCase(tf.test.TestCase):
  """TensorBoard base test class.

  This class enables logging and prints test method names.
  """

  def __init__(self, method='runTest'):
    super(TestCase, self).__init__(method)
    self._method = method
    self._db_connection_provider = None  # type: () -> db.Connection
    self.clock = FakeClock()
    self.sleep = FakeSleep(self.clock)
    self.Retrier = functools.partial(util.Retrier, sleep=self.sleep)
    self.tbase = db.TensorBase(db_connection_provider=self.connect_db,
                               retrier_factory=self.Retrier)

  def setUp(self):
    super(TestCase, self).setUp()
    util.setup_logging()
    logging.set_verbosity(logging.DEBUG)
    logger.debug('=== %s ===', self._method)
    db.TESTING_MODE = True

  def tearDown(self):
    super(TestCase, self).tearDown()
    db.TESTING_MODE = False

  def connect_db(self):
    """Establishes a PEP 249 DB connection.

    :rtype: db.Connection
    """
    if self._db_connection_provider is None:
      db_path = os.path.join(self.get_temp_dir(), 'TestCase.sqlite')
      self._db_connection_provider = (
          lambda: db.Connection(sqlite3.connect(db_path, isolation_level=None)))
      with contextlib.closing(self._db_connection_provider()) as db_conn:
        schema = db.Schema(db_conn)
        schema.create_tables()
        schema.create_indexes()
    return self._db_connection_provider()


class FakeClock(object):
  """Fake version of time.time for testing clock code.

  Classes that call time.time are encouraged to have a clock
  constructor parameter, which can be swapped out with an instance of
  this class for testing.

  This class is completely thread safe.
  """

  def __init__(self, time=0.0):
    """Creates new instance.

    Args:
      time: A float of seconds since UNIX epoch in zulu time.

    :type time: float
    """
    self._time = time
    self._lock = threading.Lock()

  def __call__(self):
    """Delegates to get_time().

    :rtype: float
    """
    return self.get_time()

  def get_time(self):
    """Returns current fake time.

    Returns:
      A float of seconds since UNIX epoch in zulu time.

    :rtype: float
    """
    with self._lock:
      return self._time

  def set_time(self, time):
    """Sets fake time.

    Args:
      time: A float of seconds since UNIX epoch in zulu time.

    :type time: float
    """
    with self._lock:
      self._time = time

  def advance(self, seconds):
    """Increments clock.

    Args:
      seconds: Number of seconds to add to internal clock time.

    :type seconds: float
    """
    with self._lock:
      self._time += seconds


class FakeSleep(object):
  """Fake version of time.sleep for testing code that sleeps.

  Classes that call time.time are encouraged to have a sleep
  constructor parameter, which can be swapped out with an instance of
  this class for testing.

  This class is useful because Google policy is that a test can not be
  considered "small" if it calls sleep, which introduces delays and
  nondeterminism.

  This class is completely thread safe.
  """

  def __init__(self, clock):
    """Creates new instance.

    Args:
      clock: A FakeClock instance.

    :type clock: FakeClock
    """
    self._clock = clock
    self._lock = threading.Lock()

  def __call__(self, seconds):
    """Pretends to sleep.

    Args:
      seconds: A float indicating the number of seconds.

    :type seconds: float
    """
    self._clock.advance(seconds)


class FileWriter(tf.summary.FileWriter):
  """FileWriter for test.

  TensorFlow FileWriter uses TensorFlow's Protobuf Python binding which is
  largely discouraged in TensorBoard. We do not want a TB.Writer but require one
  for testing in integrational style (writing out event files and use the real
  event readers).
  """

  def add_event(self, event):
    if isinstance(event, event_pb2.Event):
      tf_event = tf.Event.FromString(event.SerializeToString())
    else:
      logger.warn('Added TensorFlow event proto. '
                      'Please prefer TensorBoard copy of the proto')
      tf_event = event
    super(FileWriter, self).add_event(tf_event)

  def add_summary(self, summary, global_step=None):
    if isinstance(summary, summary_pb2.Summary):
      tf_summary = tf.Summary.FromString(summary.SerializeToString())
    else:
      logger.warn('Added TensorFlow summary proto. '
                      'Please prefer TensorBoard copy of the proto')
      tf_summary = summary
    super(FileWriter, self).add_summary(tf_summary, global_step)

  def add_session_log(self, session_log, global_step=None):
    if isinstance(session_log, event_pb2.SessionLog):
      tf_session_log = tf.compat.v1.SessionLog.FromString(session_log.SerializeToString())
    else:
      logger.warn('Added TensorFlow session_log proto. '
                      'Please prefer TensorBoard copy of the proto')
      tf_session_log = session_log
    super(FileWriter, self).add_session_log(tf_session_log, global_step)

  def add_graph(self, graph, global_step=None, graph_def=None):
    if isinstance(graph_def, graph_pb2.GraphDef):
      tf_graph_def = tf.compat.v1.GraphDef.FromString(graph_def.SerializeToString())
    else:
      tf_graph_def = graph_def

    super(FileWriter, self).add_graph(graph, global_step=global_step, graph_def=tf_graph_def)

  def add_meta_graph(self, meta_graph_def, global_step=None):
    if isinstance(meta_graph_def, meta_graph_pb2.MetaGraphDef):
      tf_meta_graph_def = tf.compat.v1.MetaGraphDef.FromString(meta_graph_def.SerializeToString())
    else:
      tf_meta_graph_def = meta_graph_def

    super(FileWriter, self).add_meta_graph(meta_graph_def=tf_meta_graph_def, global_step=global_step)


class FileWriterCache(object):
  """Cache for TensorBoard test file writers.
  """
  # Cache, keyed by directory.
  _cache = {}

  # Lock protecting _FILE_WRITERS.
  _lock = threading.RLock()

  @staticmethod
  def get(logdir):
    """Returns the FileWriter for the specified directory.

    Args:
      logdir: str, name of the directory.

    Returns:
      A `FileWriter`.
    """
    with FileWriterCache._lock:
      if logdir not in FileWriterCache._cache:
        FileWriterCache._cache[logdir] = FileWriter(
            logdir, graph=tf.compat.v1.get_default_graph())
      return FileWriterCache._cache[logdir]


def ensure_tb_summary_proto(summary):
  """Ensures summary is TensorBoard Summary proto.

  TB v1 summary API returns TF Summary proto. To make test for v1 and v2 API
  congruent, one can use this API to convert result of v1 API to TB Summary
  proto.
  """
  if isinstance(summary, summary_pb2.Summary):
    return summary

  return summary_pb2.Summary.FromString(summary.SerializeToString())
