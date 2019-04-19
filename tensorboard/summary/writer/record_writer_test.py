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

# """Tests for RecordWriter"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
from tensorboard.summary.writer.record_writer import RecordWriter
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import PyRecordReader_New
from tensorboard import test as tb_test


class RecordWriterTest(tb_test.TestCase):
  def __init__(self, *args, **kwargs):
    super(RecordWriterTest, self).__init__(*args, **kwargs)

  def test_expect_bytes_written(self):
    filename = os.path.join(self.get_temp_dir(), "recordtest")
    byte_len = 64
    w = RecordWriter(filename)
    random_bytes = bytearray(os.urandom(byte_len))
    w.write(random_bytes)
    w.close()
    with open(filename, 'rb') as f:
      self.assertEqual(len(f.read()), (8 + 4 + byte_len + 4))  # uint64+uint32+data+uint32

  def test_empty_record(self):
    filename = os.path.join(self.get_temp_dir(), "recordtest")
    w = RecordWriter(filename)
    bytes_to_write = b""
    w.write(bytes_to_write)
    w.close()
    r = PyRecordReader_New(filename)
    r.read()
    self.assertEqual(r.event_strs[0], bytes_to_write)

  def test_record_writer_roundtrip(self):
    filename = os.path.join(self.get_temp_dir(), "recordtest")
    w = RecordWriter(filename)
    bytes_to_write = b"hello world"
    for _ in range(50):
      w.write(bytes_to_write)
    w.close()

    r = PyRecordReader_New(filename)
    r.read()
    for i in range(50):
      self.assertEqual(r.event_strs[i], bytes_to_write)


if __name__ == '__main__':
  tb_test.main()
