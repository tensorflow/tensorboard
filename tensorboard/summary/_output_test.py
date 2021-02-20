# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for the `tensorboard.summary._output` module."""


import numpy as np

from tensorboard.compat.proto import summary_pb2
from tensorboard.compat.proto import types_pb2
from tensorboard.summary import _output as output_lib
from tensorboard.summary import _test_util
from tensorboard.util import tensor_util
from tensorboard import test as tb_test


class DirectoryOutputTest(tb_test.TestCase):
    def test_empty(self):
        logdir = self.get_temp_dir()
        output = output_lib.DirectoryOutput(logdir)
        output.close()
        events = _test_util.read_tfevents(logdir)
        self.assertLen(events, 1)
        self.assertEqual(events[0].file_version, "brain.Event:2")

    def test_flush_and_close(self):
        logdir = self.get_temp_dir()
        output = output_lib.DirectoryOutput(logdir)
        emit_scalar = lambda step: output.emit_scalar(
            plugin_name="plugin",
            tag="tag",
            data=np.float32(0),
            step=np.int64(step),
            wall_time=0.0,
            tag_metadata=b"meta",
            description="desc",
        )
        emit_scalar(1)
        # We can't assert on the contents of the event file prior to calling
        # flush() since it's nondeterministic depending on filesystem impl.
        # See #4582 discussion for details.
        output.flush()
        # Expect file version and first scalar event.
        events = _test_util.read_tfevents(logdir)
        self.assertLen(events, 2)
        self.assertEqual(events[0].file_version, "brain.Event:2")
        self.assertEqual(events[1].step, 1)
        emit_scalar(2)
        output.close()
        # Now we should see both scalar events.
        events = _test_util.read_tfevents(logdir)
        self.assertLen(events, 3)
        self.assertEqual(events[2].step, 2)

    def test_emit_scalar(self):
        logdir = self.get_temp_dir()
        output = output_lib.DirectoryOutput(logdir)
        output.emit_scalar(
            plugin_name="plugin",
            tag="tag",
            data=np.float32(42.0),
            step=np.int64(12),
            wall_time=123.456,
            tag_metadata=b"meta",
            description="desc",
        )
        output.close()
        events = _test_util.read_tfevents(logdir)
        self.assertLen(events, 2)
        event = events[1]
        self.assertEqual(event.step, 12)
        self.assertEqual(event.wall_time, 123.456)
        summary = event.summary.value[0]
        self.assertEqual(summary.tag, "tag")
        self.assertEqual(
            tensor_util.make_ndarray(summary.tensor), np.array(42.0)
        )
        self.assertEqual(summary.tensor.dtype, types_pb2.DT_FLOAT)
        self.assertEqual(
            summary.metadata.data_class, summary_pb2.DATA_CLASS_SCALAR
        )
        self.assertEqual(summary.metadata.plugin_data.plugin_name, "plugin")
        self.assertEqual(summary.metadata.plugin_data.content, b"meta")
        self.assertEqual(summary.metadata.summary_description, "desc")


if __name__ == "__main__":
    tb_test.main()
