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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import functools
import os

import tensorflow as tf

from tensorboard import loader
from tensorboard import test_util
from tensorboard import util


class LoaderTestCase(tf.test.TestCase):
  def __init__(self, *args, **kwargs):
    super(LoaderTestCase, self).__init__(*args, **kwargs)
    self.clock = test_util.FakeClock()

  def _save_string(self, name, data):
    """Writes new file to temp directory.

    :type name: str
    :type data: str
    """
    path = os.path.join(self.get_temp_dir(), name)
    with open(path, 'wb') as writer:
      writer.write(tf.compat.as_bytes(data))
    return path

  def _save_records(self, name, records):
    """Writes new record file to temp directory.

    :type name: str
    :type records: list[str]
    :rtype: str
    """
    path = os.path.join(self.get_temp_dir(), name)
    with RecordWriter(path) as writer:
      for record in records:
        writer.write(record)
    return path


class RecordReaderTest(LoaderTestCase):
  RecordReader = loader.RecordReader

  def testNoReads_closeWorks(self):
    path = self._save_records('empty.records', [])
    self.RecordReader(path).close()

  def testClose_canBeCalledMultipleTimes(self):
    path = self._save_records('empty.records', [])
    reader = self.RecordReader(path)
    reader.close()
    reader.close()

  def testEmptyFile_returnsNoneRecords(self):
    path = self._save_records('empty.records', [])
    with self.RecordReader(path) as reader:
      self.assertIsNone(reader.get_next_record())
      self.assertIsNone(reader.get_next_record())

  def testGetNextRecord_worksWithGoodOffsets(self):
    path = self._save_records('foobar.records', ['foo', 'bar'])
    with self.RecordReader(path) as reader:
      record1 = reader.get_next_record()
      self.assertEqual(b'foo', record1.record)
      self.assertGreater(record1.offset, 0)
      record2 = reader.get_next_record()
      self.assertEqual(b'bar', record2.record)
      self.assertGreater(record2.offset, record1.offset)
      record3 = reader.get_next_record()
      self.assertIsNone(record3)

  def testEmptyFile_sizeIsZero(self):
    path = self._save_records('empty.records', [])
    with self.RecordReader(path) as reader:
      self.assertEqual(0, reader.get_size())

  def testOneRecord_sizeIsGreaterThanRecord(self):
    path = self._save_records('foo.records', ['foo'])
    with self.RecordReader(path) as reader:
      self.assertGreater(reader.get_size(), 3)

  def testStartOffset_resumesReading(self):
    path = self._save_records('foobar.records', ['foo', 'bar'])
    with self.RecordReader(path) as reader:
      start_offset = reader.get_next_record().offset
    with self.RecordReader(path, start_offset) as reader:
      self.assertEqual(b'bar', reader.get_next_record().record)

  def testCorruptRecord_raisesDataLossError(self):
    path = self._save_string('foobar.records', 'abcd' * 4)
    with self.RecordReader(path) as reader:
      with self.assertRaises(tf.errors.DataLossError):
        self.assertEqual(b'foo', reader.get_next_record())

  def testFileShrunk_raisesIoError(self):
    path = self._save_records('foobar.records', ['foo'])
    with self.RecordReader(path) as reader:
      reader.get_next_record()
      self._save_string('foobar.records', '~~~')
      with self.assertRaises(IOError):
        reader.get_size()

  # TODO(jart): Test append behavior when PyRecordWriter supports flush.


class BufferedRecordReaderTest(RecordReaderTest):
  RecordReader = functools.partial(loader.BufferedRecordReader, stat_interval=0)


class BufferedRecordReaderSmallReadAheadTest(RecordReaderTest):
  RecordReader = functools.partial(loader.BufferedRecordReader,
                                   read_ahead=1,
                                   stat_interval=0)


@util.closeable
class RecordWriter(object):
  def __init__(self, path):
    self.path = tf.compat.as_bytes(path)
    self._writer = self._make_writer()

  def write(self, record):
    if not self._writer.WriteRecord(tf.compat.as_bytes(record)):
      raise IOError('Failed to write record to ' + self.path)

  def close(self):
    with tf.errors.raise_exception_on_not_ok_status() as status:
      self._writer.Close(status)

  def _make_writer(self):
    with tf.errors.raise_exception_on_not_ok_status() as status:
      return tf.pywrap_tensorflow.PyRecordWriter_New(
          self.path, tf.compat.as_bytes(''), status)


if __name__ == '__main__':
  tf.test.main()
