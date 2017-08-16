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

import contextlib
import functools
import logging
import os
import sqlite3
import threading

import tensorflow as tf

from tensorboard import db
from tensorboard import util


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
    tf.logging.set_verbosity(tf.logging.DEBUG)
    logging.getLogger('werkzeug').setLevel(logging.INFO)
    tf.logging.debug('=== %s ===', self._method)
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
