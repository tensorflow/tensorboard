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

# """Integration tests for the Writer."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
import os
import tempfile
from tensorboard.summary.writer.record_writer import RecordWriter
from tensorboard.compat.proto import event_pb2, summary_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import PyRecordReader_New
from tensorboard import test as tb_test

class RecordWriterTest(tb_test.TestCase):
  def __init__(self, *args, **kwargs):
    super(RecordWriterTest, self).__init__(*args, **kwargs)

  def test_expect_bytes_written(self):
    logfile = tempfile.NamedTemporaryFile().name
    w = RecordWriter(logfile)
    random_bytes = bytearray(os.urandom(64))
    w.write(random_bytes)
    w.close()
    with open(logfile, 'rb') as f:
      assert len(f.read()) == (8 + 4 + 64 + 4)  # uint64+uint32+data+uint32

  # crc'ed file content of empty data
  # b'\x00\x00\x00\x00\x00\x00\x00\x00)\x03\x98\x07\xd8\xea\x82\xa2'

  def test_empty_record(self):
    logfile = tempfile.NamedTemporaryFile().name
    w = RecordWriter(logfile)
    random_bytes = bytearray(os.urandom(0))
    w.write(random_bytes)
    w.close()
    r = PyRecordReader_New(logfile)
    r.read()
    assert r.event_strs[0] == random_bytes

  def test_record_writer_roundtrip(self):
    logfile = tempfile.NamedTemporaryFile().name
    w = RecordWriter(logfile)
    random_bytes = bytearray(os.urandom(64))
    w.write(random_bytes)
    w.close()
    with open(logfile, 'rb') as f:
      print(f.read())
    r = PyRecordReader_New(logfile)
    r.read()
    assert r.event_strs[0] == random_bytes


if __name__ == '__main__':
  tb_test.main()
