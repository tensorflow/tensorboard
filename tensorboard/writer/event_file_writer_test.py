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
# ==============================================================================

# """Integration tests for the Writer."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


import glob
import os
import tensorflow as tf
from tensorboard.writer.event_file_writer import EventFileWriter
from tensorboard.compat.proto import event_pb2, summary_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from google.protobuf import json_format

class EventFileWriterTest(tf.test.TestCase):
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
    event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), '*')))
    self.assertEqual(len(event_files), 1)
    events = list(tf.compat.v1.train.summary_iterator(event_files[0]))
    event_from_disk = events[1]
    summary_from_disk = event_from_disk.summary
    self.assertProtoEquals(summary.SerializeToString(), summary_from_disk.SerializeToString())


if __name__ == '__main__':
  tf.test.main()
