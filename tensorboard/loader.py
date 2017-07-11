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

"""TensorBoard data ingestion module."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import re
import sys
import time
import threading
import types  # pylint: disable=unused-import

import six
import tensorflow as tf

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
    tf.logging.debug('Waking up to read %s bytes', util.add_commas(want))
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
