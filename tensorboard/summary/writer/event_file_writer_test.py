# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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

# """Tests for EventFileWriter and _AsyncWriter"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


import glob
import os
import shutil
import tempfile
import time
from tensorboard.summary.writer.event_file_writer import EventFileWriter
from tensorboard.summary.writer.event_file_writer import _AsyncWriter
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import PyRecordReader_New
from tensorboard import test as tb_test


class EventFileWriterTest(tb_test.TestCase):
  def __init__(self, *args, **kwargs):
    super(EventFileWriterTest, self).__init__(*args, **kwargs)

  def test_event_file_writer_roundtrip(self):
    _TAGNAME = 'dummy'
    _DUMMY_VALUE = 42
    logdir = self.get_temp_dir()
    w = EventFileWriter(logdir)
    summary = Summary(value=[Summary.Value(tag=_TAGNAME, simple_value=_DUMMY_VALUE)])
    fakeevent = event_pb2.Event(summary=summary)
    w.add_event(fakeevent)
    w.close()
    event_files = sorted(glob.glob(os.path.join(logdir, '*')))
    self.assertEqual(len(event_files), 1)
    r = PyRecordReader_New(event_files[0])
    r.read()
    events = r.event_strs
    event_from_disk = events[1]
    self.assertEqual(fakeevent.SerializeToString(), event_from_disk)

  def test_setting_filename_suffix_works(self):
    logdir = self.get_temp_dir()

    w = EventFileWriter(logdir, filename_suffix='.event_horizon')
    w.close()
    event_files = sorted(glob.glob(os.path.join(logdir, '*')))
    self.assertEqual(event_files[0].split('.')[-1], 'event_horizon')


class AsyncWriterTest(tb_test.TestCase):
  def __init__(self, *args, **kwargs):
    super(AsyncWriterTest, self).__init__(*args, **kwargs)

  def test_async_writer_without_write(self):
    for i in range(100):
      logdir = self.get_temp_dir()
      w = EventFileWriter(logdir)
      w.close()
      event_files = sorted(glob.glob(os.path.join(logdir, '*')))
      r = PyRecordReader_New(event_files[0])
      r.read()
      events = r.event_strs
      self.assertEqual(len(events), 1)
      s = event_pb2.Event()
      s.ParseFromString(events[0])
      self.assertEqual(s.file_version, "brain.Event:2")

  def test_async_writer_write_once(self):
    filename = os.path.join(self.get_temp_dir(), "async_writer_write_once")
    w = _AsyncWriter(open(filename, 'wb'))
    bytes_to_write = b"hello world"
    w.write(bytes_to_write)
    w.close()
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), bytes_to_write)

  def test_async_writer_write_queue_full(self):
    filename = os.path.join(self.get_temp_dir(), "async_writer_write_queue_full")
    w = _AsyncWriter(open(filename, 'wb'), dummy_delay=True)
    bytes_to_write = b"hello world"
    repeat = 100
    for i in range(repeat):
      w.write(bytes_to_write)
    w.close()
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), bytes_to_write * repeat)

  def test_async_writer_write_one_slot_queue(self):
    filename = os.path.join(self.get_temp_dir(), "async_writer_write_one_slot_queue")
    w = _AsyncWriter(open(filename, 'wb'), max_queue_size=1, dummy_delay=True)
    bytes_to_write = b"hello world"
    repeat = 10  # faster
    for i in range(repeat):
      w.write(bytes_to_write)
    w.close()
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), bytes_to_write * repeat)

  # write         ...................................
  # flush         ---------^---------^---------^           (^: flush -: idle)
  # #obj in queue 12345678901234567890  (expected, because the IO overhead)
  # Make strict comparion for the flushing result is possible, but it requires accessing
  # the queue inside the async writer. So I write the test to simulate real write and flush.
  # In my experiment, the tolerance can be set as high to roughly to 0.95.
  # I set 0.9 here in case the CI is too slow.

  def test_async_writer_auto_flushing(self):
    filename = os.path.join(self.get_temp_dir(), "async_writer_auto_flushing")
    flush_timer = 1
    tolerance = 0.9  # The undelying writer need time to complete.
    w = _AsyncWriter(open(filename, 'wb'), max_queue_size=500, flush_secs=flush_timer)
    random_bytes = bytearray(os.urandom(64))
    repeat = 100
    for i in range(repeat):
      w.write(random_bytes)
      time.sleep(0.1)
      if i % (flush_timer * 10) == 0:
        with open(get_copy_by_OS(filename), 'rb') as f:
          nbytes = len(f.read())
          # print(i, nbytes, i * len(random_bytes) * tolerance, nbytes / (1+i * len(random_bytes)))
          self.assertGreaterEqual(nbytes, i * len(random_bytes) * tolerance)
    w.close()

    # make sure all data is written
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), random_bytes * repeat)

  def test_async_writer_flush_before_flush_secs(self):
    # This test equals test_async_writer_write_once,
    # since flush() is implicitly called by close() and the default flush time is 120 secs.
    filename = os.path.join(self.get_temp_dir(), "async_writer_flush_before_flush_secs")
    w = _AsyncWriter(open(filename, 'wb'))
    random_bytes = bytearray(os.urandom(64))
    w.write(random_bytes)
    w.flush()  # flush() is implicitly called by close()
    w.close()
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), random_bytes)

  def test_async_writer_close_triggers_flush(self):
    # This test equals test_async_writer_write_once,
    # since flush() is implicitly called by close() and the default flush time is 120 secs.
    filename = os.path.join(self.get_temp_dir(), "async_writer_close_triggers_flush")
    w = _AsyncWriter(open(filename, 'wb'))
    random_bytes = bytearray(os.urandom(64))
    w.write(random_bytes)
    w.close()
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), random_bytes)

  def test_write_after_async_writer_closed(self):
    filename = os.path.join(self.get_temp_dir(), "write_after_async_writer_closed")
    w = _AsyncWriter(open(filename, 'wb'))
    random_bytes = bytearray(os.urandom(64))
    w.write(random_bytes)
    w.close()

    with self.assertRaises(IOError):
      w.write(random_bytes)
    # nothing is written to the file after close
    with open(filename, 'rb') as f:
      self.assertEqual(f.read(), random_bytes)


def get_copy_by_OS(oldfilename):
  newfilename = tempfile.NamedTemporaryFile().name
  shutil.copy(oldfilename, newfilename)
  return newfilename


if __name__ == '__main__':
  tb_test.main()
