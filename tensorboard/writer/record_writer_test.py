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
import tensorflow as tf
from tensorboard.writer.record_writer import RecordWriter
from tensorboard.compat.proto import event_pb2, summary_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from google.protobuf import json_format

class RecordWriterTest(tf.test.TestCase):
  def __init__(self, *args, **kwargs):
    super(RecordWriterTest, self).__init__(*args, **kwargs)

  def test_expect_bytes_written(self):
    pass

  def test_empty_record(self):
    pass

  def test_record_writer_roundtrip(self):
    pass

    
if __name__ == '__main__':
  tf.test.main()
