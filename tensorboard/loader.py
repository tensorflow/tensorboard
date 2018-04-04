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

"""TensorBoard data ingestion module.

WARNING: This module is currently EXPERIMENTAL.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import contextlib
import functools
import inspect
import locale
import logging
import os
import re
import sys
import threading
import time
import types  # pylint: disable=unused-import

import six
import tensorflow as tf

from tensorboard import db
from tensorboard import util


class Record(collections.namedtuple('Record', ('record', 'offset'))):
  """Value class for a record returned by RecordReader.

  Fields:
    record: The byte string record that was read.
    offset: The byte offset in the file *after* this record was read.

  :type record: str
  :type offset: int
  """
  __slots__ = ()  # Enforces use of only tuple fields.


@util.closeable
@six.python_2_unicode_compatible
class RecordReader(object):
  """Pythonic veneer around PyRecordReader."""

  def __init__(self, path, start_offset=0):
    """Creates new instance.

    Args:
      path: Path of file. This can be on a remote file system if the
          TensorFlow build supports it.
      start_offset: Byte offset to seek in file once it's opened.

    :type path: str
    :type start_offset: int
    """
    self.path = tf.compat.as_text(path)
    self._offset = start_offset
    self._size = -1
    self._reader = None  # type: tf.pywrap_tensorflow.PyRecordReader
    self._is_closed = False
    self._lock = threading.Lock()

  def get_size(self):
    """Returns byte length of file.

    This is guaranteed to return a number greater than or equal to the
    offset of the last record returned by get_next_record().

    This method can be called after the instance has been closed.

    Raises:
      IOError: If file has shrunk from last read offset, or start
          offset, or last read size.

    :rtype: int
    """
    size = tf.gfile.Stat(self.path).length
    minimum = max(self._offset, self._size)
    if size < minimum:
      raise IOError('File shrunk: %d < %d: %s' % (size, minimum, self.path))
    self._size = size
    return size

  def get_next_record(self):
    """Reads record from file.

    Returns:
      A Record or None if no more were available.

    Raises:
      IOError: On open or read error, or if close was called.
      tf.errors.DataLossError: If corruption was encountered in the
          records file.

    :rtype: Record
    """
    if self._is_closed:
      raise IOError('%s is closed' % self)
    if self._reader is None:
      self._reader = self._open()
    try:
      if not inspect.getargspec(self._reader.GetNext).args[1:]: # pylint: disable=deprecated-method
        self._reader.GetNext()
      else:
        # GetNext() expects a status argument on TF <= 1.7
        with tf.errors.raise_exception_on_not_ok_status() as status:
          self._reader.GetNext(status)
    except tf.errors.OutOfRangeError:
      # We ignore partial read exceptions, because a record may be truncated.
      # PyRecordReader holds the offset prior to the failed read, so retrying
      # will succeed.
      return None
    self._offset = self._reader.offset()
    return Record(self._reader.record(), self._offset)

  def close(self):
    """Closes record reader if open.

    Further reads are not permitted after this method is called.
    """
    if self._is_closed:
      return
    if self._reader is not None:
      self._reader.Close()
    self._is_closed = True
    self._reader = None

  def _open(self):
    with tf.errors.raise_exception_on_not_ok_status() as status:
      return tf.pywrap_tensorflow.PyRecordReader_New(
          tf.resource_loader.readahead_file_path(tf.compat.as_bytes(self.path)),
          self._offset, tf.compat.as_bytes(''), status)

  def __str__(self):
    return u'RecordReader{%s}' % self.path


@util.closeable
@six.python_2_unicode_compatible
class BufferedRecordReader(object):
  """Wrapper around RecordReader that does threaded read-ahead.

  This class implements the same interface as RecordReader. It prevents
  remote file systems from devastating loader performance. It does not
  degrade throughput on local file systems.

  The thread is spawned when the first read operation happens. The
  thread will diligently try to buffer records in the background. Its
  goal is to sleep as much as possible without blocking read operations.

  This class is thread safe. It can be used from multiple threads
  without any need for external synchronization.
  """

  READ_AHEAD_AGGRESSION = 2.3  # Does full replenish when ~40% full.
  READ_AHEAD_BYTES = 16 * 1024 * 1024
  STAT_INTERVAL_SECONDS = 4.0

  def __init__(self, path,
               start_offset=0,
               read_ahead=READ_AHEAD_BYTES,
               stat_interval=STAT_INTERVAL_SECONDS,
               clock=time.time,
               record_reader_factory=RecordReader):
    """Creates new instance.

    The i/o thread is not started until the first read happens.

    Args:
      path: Path of file. This can be on a remote file system if the
          TensorFlow build supports it.
      start_offset: Byte offset to seek in file once it's opened.
      read_ahead: The number of record bytes to buffer into memory
          before the thread starts blocking. This value must be >0 and
          the default is BufferedRecordReader.READ_AHEAD_BYTES.
      stat_interval: A float with the minimum number of seconds between
          stat calls, to determine the file size. If this is 0.0 then
          the thread will stat after every re-buffer, but never be
          woken up in order to stat.
      clock: Function returning a float with the number of seconds
          since the UNIX epoch in zulu time.
      record_reader_factory: The RecordReader constructor, which can be
          changed for testing.

    :type path: str
    :type start_offset: int
    :type read_ahead: int
    :type clock: () -> float
    :type record_reader_factory: (str, int) -> RecordReader
    """
    self.path = tf.compat.as_text(path)
    self._read_ahead = read_ahead
    self._stat_interval = stat_interval
    self._clock = clock
    self._is_closed = False
    self._has_reached_end = False
    self._offset = 0
    self._size = -1
    self._last_stat = 0.0
    self._buffered = 0
    self._reader = record_reader_factory(self.path, start_offset)
    self._records = collections.deque()  # type: collections.deque[Record]
    self._read_exception = \
        None  # type: tuple[BaseException, BaseException, types.TracebackType]
    self._close_exception = \
        None  # type: tuple[BaseException, BaseException, types.TracebackType]
    self._lock = threading.Lock()
    self._wake_up_producer = threading.Condition(self._lock)
    self._wake_up_consumers = threading.Condition(self._lock)
    self._thread = threading.Thread(target=self._run,
                                    name=_shorten_event_log_path(self.path))

  def get_size(self):
    """Returns byte length of file.

    This is guaranteed to return a number greater than or equal to the
    offset of the last record returned by get_next_record().

    In the average case, this method will not block. However, if the
    i/o thread has not yet computed this value, then this method will
    block on a stat call.

    This method can be called after the instance has been closed.

    Returns:
      The byte length of file, which might increase over time, but is
      guaranteed to never decrease. It's also guaranteed that it will
      be greater than or equal to the offset field of any Record.

    :rtype: int
    """
    with self._lock:
      if self._should_stat():
        self._stat()
      return self._size

  def get_next_record(self):
    """Reads one record.

    When this method is first called, it will spawn the thread and
    block until a record is read. Once the thread starts, it will queue
    up records which can be read without blocking. The exception is
    when we reach the end of the file, in which case each repeated call
    will be synchronous. There is no background polling. If new data is
    appended to the file, new records won't be buffered until this
    method is invoked again. The caller should take care to meter calls
    to this method once it reaches the end of file, lest they impact
    performance.

    Returns:
      A Record object, or None if there are no more records available
      at the moment.

    Raises:
      IOError: If this instance has been closed.
      tf.errors.DataLossError: If corruption was encountered in the
          records file.
      Exception: To propagate any exceptions that may have been thrown
          by the read operation in the other thread. If an exception is
          thrown, then all subsequent calls to this method will rethrow
          that same exception.

    :rtype: Record
    """
    with self._lock:
      if self._is_closed:
        raise IOError('%s is closed' % self)
      if not self._thread.is_alive():
        self._thread.start()
      else:
        record = self._get_record()
        if record is not None:
          if self._should_wakeup():
            self._wake_up_producer.notify()
          return record
        self._has_reached_end = False
        self._wake_up_producer.notify()
      while not (self._read_exception or
                 self._has_reached_end or
                 self._records):
        self._wake_up_consumers.wait()
      return self._get_record()

  def close(self):
    """Closes event log reader if open.

    If the i/o thread is running, this method blocks until it has been
    shut down.

    Further reads are not permitted after this method is called.

    Raises:
      Exception: To propagate any exceptions that may have been thrown
          by the close operation in the other thread. If an exception
          is thrown, then all subsequent calls to this method will
          rethrow that same exception.
    """
    with self._lock:
      if not self._is_closed:
        self._is_closed = True
        if not self._thread.is_alive():
          self._reader = None
          return
        self._wake_up_producer.notify()
      while self._reader is not None:
        self._wake_up_consumers.wait()
      if self._close_exception is not None:
        six.reraise(*self._close_exception)

  def _get_record(self):
    if self._read_exception is not None:
      six.reraise(*self._read_exception)
    if not self._records:
      return None
    record = self._records.popleft()
    self._buffered -= len(record.record)
    return record

  @util.guarded_by('_lock')
  def _should_wakeup(self):
    return (self._is_closed or
            self._read_exception is None and
            (self._should_rebuffer() or
             (self._stat_interval and self._should_stat())))

  @util.guarded_by('_lock')
  def _should_rebuffer(self):
    return (not self._has_reached_end and
            (float(self._buffered) <
             self._read_ahead / BufferedRecordReader.READ_AHEAD_AGGRESSION))

  @util.guarded_by('_lock')
  def _should_stat(self):
    return (self._read_exception is None and
            (self._offset > self._size or
             self._last_stat <= self._clock() - self._stat_interval))

  @util.guarded_by('_lock')
  def _stat(self):
    try:
      now = self._clock()
      self._size = self._reader.get_size()
      self._last_stat = now
    except Exception as e:  # pylint: disable=broad-except
      tf.logging.debug('Stat failed: %s', e)
      self._read_exception = sys.exc_info()

  def _run(self):
    while True:
      with self._lock:
        while not self._should_wakeup():
          self._wake_up_producer.wait()
        if self._is_closed:
          try:
            self._reader.close()
            tf.logging.debug('Closed')
          except Exception as e:  # pylint: disable=broad-except
            self._close_exception = sys.exc_info()
            tf.logging.debug('Close failed: %s', e)
          self._reader = None
          self._wake_up_consumers.notify_all()
          return
        if self._buffered >= self._read_ahead:
          tf.logging.debug('Waking up to stat')
          self._stat()
          continue
        # Calculate a good amount of data to read outside the lock.
        # The less we have buffered, the less re-buffering we'll do.
        # We want to minimize wait time in the other thread. See the
        # following contour plot: https://goo.gl/HTBcCU
        x = float(self._buffered)
        y = BufferedRecordReader.READ_AHEAD_AGGRESSION
        c = float(self._read_ahead)
        want = int(min(c - x, y/c * x**y + 1))
      # Perform re-buffering outside lock.
      self._rebuffer(want)

  def _rebuffer(self, want):
    tf.logging.debug('Waking up to read %s bytes', _localize_int(want))
    records = []
    read_exception = self._read_exception
    if read_exception is None:
      try:
        while want > 0:
          record = self._reader.get_next_record()
          if record is None:
            break
          self._offset = record.offset
          records.append(record)
          want -= len(record.record)
      except Exception as e:  # pylint: disable=broad-except
        tf.logging.debug('Read failed: %s', e)
        read_exception = sys.exc_info()
    with self._lock:
      self._read_exception = read_exception
      if self._should_stat():
        self._stat()
      if not self._read_exception:
        if not records:
          self._has_reached_end = True
        else:
          for record in records:
            self._records.append(record)
            self._buffered += len(record.record)
      self._wake_up_consumers.notify_all()

  def __str__(self):
    return u'BufferedRecordReader{%s}' % self.path


class RateCounter(object):
  """Utility class for tracking how much a number increases each second.

  The rate is calculated by averaging of samples within a time window,
  which weights recent samples more strongly.
  """

  def __init__(self, window, clock=time.time):
    """Creates new instance.

    Args:
      window: The maximum number of seconds across which rate is
          averaged. In practice, the rate might be averaged over a time
          period greater than window if set_value is being called less
          frequently than window.
      clock: Function returning a float with the number of seconds
          since the UNIX epoch in zulu time.

    :type window: float
    :type clock: () -> float
    """
    self._window = window
    self._clock = clock
    self._points = collections.deque()
    self._last_value = None  # type: float
    self._last_time = None  # type: float

  def get_rate(self):
    """Determines rate of increase in value per second averaged over window.

    Returns:
      An integer representing the rate or None if not enough
      information has been collected yet.

    :rtype: int
    """
    points = []
    total_elapsed = 0.0
    total_weight = 0.0
    for rate, elapsed, _ in self._points:
      weight = 1.0 / (total_elapsed + 1) * elapsed
      total_elapsed += elapsed
      total_weight += weight
      points.append((rate, weight))
    if not total_weight:
      return 0
    return int(sum(w / total_weight * r for r, w in points))

  def set_value(self, value):
    """Sets number state.

    This method adds a delta between value and the value of the last
    time this method was called. Therefore the first invocation does
    not add a delta.

    Raises:
      ValueError: If value is less than the last value.

    :type value: float
    """
    value = float(value)
    now = self._clock()
    if self._last_value is None:
      self._last_value = value
      self._last_time = now
      return
    if value < self._last_value:
      raise ValueError('%f < %f' % (value, self._last_value))
    delta = value - self._last_value
    elapsed = now - self._last_time
    if not elapsed:
      return
    self._points.appendleft((delta / elapsed, elapsed, now))
    self._last_time = now
    self._last_value = value
    self._remove_old_points()

  def bump(self):
    """Makes time since last set_value count for nothing."""
    self._last_time = self._clock()

  def _remove_old_points(self):
    threshold = self._clock() - self._window
    while self._points:
      r, e, t = self._points.pop()
      if t > threshold:
        self._points.append((r, e, t))
        break


@util.closeable
class Progress(object):
  """Terminal UI for displaying job progress in terms of bytes.

  On teletypes, this class will display a nice ephemeral unicode
  progress bar. Otherwise it just emits periodic log messages.

  This class keeps track of the rate at which input is processed, as
  well as the rate it grows. These values are represented to the user
  using the DELTA and NABLA symbols.

  An alarm is displayed if the consumption rate falls behind the
  production rate. In order for this to be calculated properly, the
  sleep method of this class should be used rather than time.sleep.
  """

  BAR_INTERVAL_SECONDS = 0.25
  BAR_LOGGER = logging.getLogger('tensorflow' + util.LogHandler.EPHEMERAL)
  BAR_WIDTH = 45
  BLOCK_DARK = u'\u2593'
  BLOCK_LIGHT = u'\u2591'
  DELTA = u'\u2206'
  LOG_INTERVAL_SECONDS = 5.0
  NABLA = u'\u2207'
  RATE_WINDOW = 20.0

  def __init__(self, clock=time.time,
               sleep=time.sleep,
               log_callback=tf.logging.info,
               bar_callback=BAR_LOGGER.info,
               rate_counter_factory=RateCounter):
    """Creates new instance.

    Args:
      clock: Function returning a float with the number of seconds
          since the UNIX epoch in zulu time.
      sleep: Injected time.sleep function.
      log_callback: Callback for emitting normal log records.
      bar_callback: Callback for emitting ephemeral bar records.
      rate_counter_factory: Constructor to RateCounter, which can be
          swapped out for testing.

    :type clock: () -> float
    :type sleep: (float) -> None
    :type rate_counter_factory: (float) -> RateCounter
    """
    self._clock = clock
    self._sleep = sleep
    self._log_callback = log_callback
    self._bar_callback = bar_callback
    self._initialized = False
    self._offset = 0
    self._size = 0
    self._last_log_time = 0.0
    self._last_bar_time = 0.0
    self._last_log_offset = -1
    self._last_bar_offset = -1
    self._rate_offset = rate_counter_factory(Progress.RATE_WINDOW)
    self._rate_size = rate_counter_factory(Progress.RATE_WINDOW)

  def set_progress(self, offset, size):
    """Updates the progress bar state.

    This method will cause progress information to be occasionally
    written out.

    Args:
      offset: The number of bytes processed so far.
      size: The total number of bytes. This is allowed to increase or
          decrease, but it must remain at least offset.

    Raises:
      ValueError: If offset is greater than size, or offset or size
          decreased from the last invocation.

    :type offset: int
    :type size: int
    """
    if offset > size:
      raise ValueError('offset (%d) can not exceed size (%d)' % (offset, size))
    self._rate_offset.set_value(offset)
    self._rate_size.set_value(size)
    self._offset = offset
    self._size = size
    now = self._clock()
    if not self._initialized:
      self._last_log_time = now
      self._last_bar_time = now
      self._initialized = True
      return
    elapsed = now - self._last_log_time
    if elapsed >= Progress.LOG_INTERVAL_SECONDS:
      self._last_log_time = now
      self._show_log()
    elapsed = now - self._last_bar_time
    if elapsed >= Progress.BAR_INTERVAL_SECONDS:
      self._last_bar_time = now
      self._show_bar()

  def close(self):
    """Forces progress to be written to log.

    This method exists because we don't want the progress bar to say
    something like 98% once the file is done loading.
    """
    self._show_log(can_stall=False)
    self._show_bar(can_stall=False)
    # Instructs util.LogHandler to clear the ephemeral logging state.
    self._bar_callback('')

  def sleep(self, seconds):
    """Sleeps for a given number of seconds.

    Time spent sleeping in this method does not have a detrimental
    impact on the consumption rate.

    :type seconds: float
    """
    self._sleep(seconds)
    self._rate_offset.bump()

  def _show_log(self, can_stall=True):
    is_stalled = can_stall and self._offset == self._last_log_offset
    self._last_log_offset = self._offset
    self._log_callback('Loaded %s', self._get_message(is_stalled))

  def _show_bar(self, can_stall=True):
    is_stalled = can_stall and self._offset == self._last_bar_offset
    self._last_bar_offset = self._offset
    sofar = int(self._get_fraction() * Progress.BAR_WIDTH)
    bar = (Progress.BLOCK_DARK * sofar +
           Progress.BLOCK_LIGHT * (Progress.BAR_WIDTH - sofar))
    self._bar_callback(u'%s %s ', bar, self._get_message(is_stalled))

  def _get_message(self, is_stalled):
    rate_offset = self._rate_offset.get_rate()  # summary processing speed
    rate_size = self._rate_size.get_rate()  # summary production speed
    message = u'%d%% of %s%s%s' % (
        int(self._get_fraction() * 100.0),
        _localize_int(self._size),
        self._get_rate_suffix(Progress.DELTA, rate_offset),
        self._get_rate_suffix(Progress.NABLA, rate_size))
    if rate_offset and rate_size and rate_offset < rate_size:
      # If TensorFlow is writing summaries to disk faster than we can
      # insert them into the database, that's kind of problematic.
      message += u' ' + self._make_red(u'[meltdown]')
    elif is_stalled:
      message += u' %s[stalled]%s' % (util.Ansi.BOLD, util.Ansi.RESET)
    return message

  def _get_fraction(self):
    if not self._size:
      return 0.0
    else:
      return float(self._offset) / self._size

  def _get_rate_suffix(self, symbol, rate):
    if not rate:
      return u''
    return u' %s %sB/s' % (symbol, _localize_int(rate))

  def _make_red(self, text):
    return (util.Ansi.BOLD +
            util.Ansi.RED +
            (util.Ansi.FLIP if self._offset % 2 == 0 else u'') +
            text +
            util.Ansi.RESET)


@util.closeable
@functools.total_ordering
@six.python_2_unicode_compatible
class EventLogReader(object):
  """Helper class for reading from event log files.

  This class is a wrapper around BufferedRecordReader that operates on
  record files containing tf.Event protocol buffers.

  Fields:
    rowid: An integer primary key in EventLogs table, or 0 if unknown.
    path: A string with the path of the event log on the local or
        remote file system.
    timestamp: An integer of the number of seconds since the UNIX epoch
        in UTC according to hostname at the time when the event log
        file was created.
    hostname: A string with the FQDN of the machine that wrote this
        event log file.
  """

  def __init__(self, path,
               start_offset=0,
               record_reader_factory=BufferedRecordReader):
    """Creates new instance.

    Args:
      path: Path of event log file.
      start_offset: Byte offset to seek in file once it's opened.
      record_reader_factory: A reference to the constructor of a class
          that implements the same interface as RecordReader.

    :type path: str
    :type record_reader_factory: (str, int) -> RecordReader
    """
    self.rowid = 0
    self.path = tf.compat.as_text(path)
    m = _EVENT_LOG_PATH_PATTERN.search(self.path)
    if not m:
      raise ValueError('Bad event log path: ' + self.path)
    self.timestamp = int(m.group('timestamp'))
    self.hostname = m.group('hostname')
    self._offset = start_offset
    self._reader_factory = record_reader_factory
    self._reader = self._reader_factory(self.path, start_offset)
    self._key = (os.path.dirname(self.path), self.timestamp, self.hostname)

  def get_next_event(self):
    """Reads an event proto from the file.

    Returns:
      A tf.Event or None if no more records exist in the file. Please
      note that the file remains open for subsequent reads in case more
      are appended later.

    :rtype: tf.Event
    """
    record = self._reader.get_next_record()
    if record is None:
      return None
    event = tf.Event()
    event.ParseFromString(record.record)
    self._offset = record.offset
    return event

  def set_offset(self, offset):
    """Sets byte offset in file.

    :type offset: int
    """
    if offset == self._offset:
      return
    self._reader.close()
    self._reader = self._reader_factory(self.path, offset)
    self._offset = offset

  def get_offset(self):
    """Returns current byte offset in file.

    :rtype: int
    """
    return self._offset

  def get_size(self):
    """Returns byte length of file.

    :rtype: int
    """
    return self._reader.get_size()

  def save_progress(self, db_conn):
    """Saves current offset to DB.

    The rowid property must be set beforehand.

    :type db_conn: db.Connection
    """
    with contextlib.closing(db_conn.cursor()) as c:
      c.execute(
          'UPDATE EventLogs SET offset = ? WHERE rowid = ? AND offset < ?',
          (self._offset, self.rowid, self._offset))

  def close(self):
    """Closes event log reader if open.

    Further i/o is not permitted after this method is called.
    """
    if self._reader is not None:
      self._reader.close()
      self._reader = None

  def __hash__(self):
    return hash(self._key)

  def __eq__(self, other):
    return self._key == other._key

  def __lt__(self, other):
    return self._key < other._key

  def __str__(self):
    offset = self.get_offset()
    if offset:
      return u'EventLogReader{path=%s, offset=%d}' % (self.path, offset)
    else:
      return u'EventLogReader{%s}' % self.path


@util.closeable
@functools.total_ordering
@six.python_2_unicode_compatible
class RunReader(object):
  """Utility for loading event logs into the DB.

  This class merges the chain of event log files into one meaningful
  stream of events, ordered by step or timestamp.

  Fields:
    rowid: The primary key of the corresponding row in Runs.
    name: Display name of this run.
  """

  def __init__(self, rowid, name):
    """Creates new instance.

    Args:
      rowid: Primary key of run in `Runs` table, which should already
          be inserted. This is a bit-packed int made by db.RUN_ROWID.
      name: Display name of run.

    :type rowid: int
    :type name: str
    """
    self.rowid = db.RUN_ROWID.check(rowid)
    self.run_id = db.RUN_ROWID.parse(rowid)[1]
    self.name = tf.compat.as_text(name)
    self._mark = -1
    self._logs = []  # type: list[EventLogReader]
    self._index = 0
    self._entombed_progress = 0
    self._saved_events = \
        collections.deque()  # type: collections.deque[tf.Event]
    self._prepended_events = \
        collections.deque()  # type: collections.deque[tf.Event]

  def add_event_log(self, db_conn, log):
    """Adds event log to run loader.

    Event logs must be added monotonically, based on the timestamp in
    the filename. Please note that calling this method could cause a
    current batch of reads to fast forward.

    Args:
      db_conn: A PEP 249 Connection object.
      log: An EventLogReader instance.

    Returns:
      True if log was actually added.

    :type db_conn: db.Connection
    :type log: EventLogReader
    :rtype: bool
    """
    if self._logs and log <= self._logs[-1]:
      return False
    with contextlib.closing(db_conn.cursor()) as c:
      c.execute(
          'SELECT rowid, offset FROM EventLogs WHERE run_id = ? AND path = ?',
          (self.run_id, log.path))
      row = c.fetchone()
      if row:
        log.rowid = row[0]
        log.set_offset(row[1])
      else:
        event_log_id = db.EVENT_LOG_ID.generate()
        log.rowid = db.EVENT_LOG_ROWID.create(self.run_id, event_log_id)
        c.execute(
            ('INSERT INTO EventLogs (rowid, run_id, path, offset)'
             ' VALUES (?, ?, ?, 0)'),
            (log.rowid, self.run_id, log.path))
    tf.logging.debug('Adding %s', log)
    self._logs.append(log)
    # Skip over event logs we've already read.
    if log.get_offset() > 0 and not self._prepended_events:
      self._index = len(self._logs) - 1
      self._cleanup()
    return True

  def get_next_event(self):
    """Returns next tf.Event from event logs or None if stalled.

    :rtype: tf.Event
    """
    event = None
    if self._prepended_events:
      event = self._prepended_events.popleft()
    elif self._index < len(self._logs):
      while True:
        log = self._logs[self._index]
        event = log.get_next_event()
        if event is not None:
          break
        if self._index == len(self._logs) - 1:
          break
        self._index += 1
        self._cleanup()
    if event is not None and self._mark != -1:
      self._saved_events.append(event)
    return event

  def mark_peek_reset(self):
    """Returns next event without advancing.

    Note: This method sets the mark to the current position.

    :rtype: tf.Event
    """
    self.mark()
    result = self.get_next_event()
    self.reset()
    return result

  def get_offset(self):
    """Returns number of bytes read across all event log files.

    :rtype: int
    """
    if self._mark != -1:
      return self._mark
    return self._get_offset()

  def _get_offset(self):
    return sum(el.get_offset() for el in self._logs) + self._entombed_progress

  def get_size(self):
    """Returns sum of byte lengths of event log files.

    :rtype: int
    """
    return sum(el.get_size() for el in self._logs) + self._entombed_progress

  def save_progress(self, db_conn):
    """Saves current offsets of all open event logs to DB.

    This should be called after the mark has been advanced.

    :type db_conn: db.Connection
    """
    n = 0
    while self._index >= n < len(self._logs):
      self._logs[n].save_progress(db_conn)
      n += 1

  def mark(self):
    """Marks current position in file so reset() can be called."""
    if self._prepended_events:
      raise ValueError('mark() offsets must be monotonic')
    self._mark = self._get_offset()
    self._saved_events.clear()

  def reset(self):
    """Resets read state to where mark() was called."""
    if self._mark == -1:
      return
    self._prepended_events.extend(self._saved_events)
    self._saved_events.clear()

  def close(self):
    """Closes all event log readers.

    This method may be called multiple times, but further operations
    are not permitted.

    Raises:
      Exception: To propagate the most recent exception thrown by the
          EventLogReader close method. Suppressed exceptions are
          logged.
    """
    util.close_all(self._logs)
    self._index = len(self._logs)
    self._mark = -1
    self._prepended_events.clear()
    self._saved_events.clear()

  def _cleanup(self):
    # Last event log has to be preserved so we can continue enforcing
    # monotonicity. We entomb offset because that also has to be
    # monotonic, but the size does not.
    if 0 < self._index < len(self._logs):
      deleted = self._logs[:self._index]
      self._logs = self._logs[self._index:]
      self._index = 0
      self._entombed_progress += sum(l.get_offset() for l in deleted)
      util.close_all(deleted)

  def _skip_to_event_log(self, i):
    should_mark = self._mark != -1 and i > self._index
    self._index = i
    if should_mark:
      self._prepended_events.clear()
      self.mark()

  def __hash__(self):
    return hash(self.rowid)

  def __eq__(self, other):
    return self.rowid == other.rowid

  def __lt__(self, other):
    return self.rowid < other.rowid

  def __str__(self):
    offset = self.get_offset()
    if offset:
      return u'RunReader{name=%s, offset=%d}' % (self.name, offset)
    else:
      return u'RunReader{%s}' % self.name


def _get_basename(path):
  """Gets base name of path.

  This is the same as os.path.basename, however it may potentially do
  i/o to handle a few edge cases, which would otherwise cause the
  result to be less meaningful, e.g. "." and "..".

  :type path: str
  :rtype: str
  """
  return os.path.basename(os.path.normpath(os.path.join(_get_cwd(), path)))


def _get_cwd():
  """Returns current directory and try not to expand symlinks.

  :rtype: str
  """
  result = os.environ.get('PWD')
  if not result:
    result = os.getcwd()
  return result


def get_event_logs(directory):
  """Walks directory tree for EventLogReader files.

  Args:
    directory: Path of directory.

  Returns:
    List of EventLogReader objects, ordered by directory name and
    timestamp.

  :type directory: str
  :rtype: list[EventLogReader]
  """
  logs = []
  for dirname, _, filenames in tf.gfile.Walk(directory):
    for filename in filenames:
      if is_event_log_file(filename):
        logs.append(EventLogReader(os.path.join(dirname, filename)))
  logs.sort()
  return logs


_EVENT_LOG_PATH_PATTERN = re.compile(
    r'\.tfevents\.(?P<timestamp>\d+).(?P<hostname>[-.0-9A-Za-z]+)$')


def is_event_log_file(path):
  """Returns True if path appears to be an event log file.

  :type path: str
  :rtype: bool
  """
  return bool(_EVENT_LOG_PATH_PATTERN.search(path))


_SHORTEN_EVENT_LOG_PATH_PATTERN = re.compile(r'(?:[^/\\]+[/\\])?(?:[^/\\]+)$')


def _shorten_event_log_path(path):
  """Makes an event log path more human readable.

  Returns:
    Path containing only basename and the first parent directory name,
    if there is one.

  :type path: str
  :rtype: str
  """
  m = _SHORTEN_EVENT_LOG_PATH_PATTERN.search(path)
  return m.group(0) if m else None


def _localize_int(n):
  """Adds locale specific thousands group separators.

  :type n: int
  :rtype: str
  """
  return locale.format('%d', n, grouping=True)
