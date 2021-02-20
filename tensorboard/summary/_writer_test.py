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
"""Tests for the `tensorboard.summary._writer` module."""

import time
from unittest import mock

import numpy as np

from tensorboard.compat.proto import summary_pb2
from tensorboard.summary import _output as output_lib
from tensorboard.summary import _writer as writer_lib
from tensorboard.summary import _test_util
from tensorboard.util import tensor_util
from tensorboard import test as tb_test


class WriterTest(tb_test.TestCase):
    def test_real_directory(self):
        logdir = self.get_temp_dir()
        w = writer_lib.Writer(logdir)
        w.close()
        events = _test_util.read_tfevents(logdir)
        self.assertLen(events, 1)
        self.assertEqual(events[0].file_version, "brain.Event:2")

    def test_flush(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.flush()
        output.flush.assert_called_once()

    def test_flush_after_close(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.close()
        with self.assertRaisesRegex(RuntimeError, "already closed"):
            w.flush()

    def test_close(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.close()
        output.close.assert_called_once()

    def test_close_after_close(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.close()
        with self.assertRaisesRegex(RuntimeError, "already closed"):
            w.close()


class WriterAddScalarTest(tb_test.TestCase):
    def test_real_directory(self):
        logdir = self.get_temp_dir()
        w = writer_lib.Writer(logdir)
        w.add_scalar("foo", 42.0, 12, wall_time=123.456, description="fooful")
        w.close()
        events = _test_util.read_tfevents(logdir)
        self.assertLen(events, 2)
        self.assertEqual(events[0].file_version, "brain.Event:2")
        event = events[1]
        self.assertEqual(event.step, 12)
        self.assertEqual(event.wall_time, 123.456)
        summary = event.summary.value[0]
        self.assertEqual(summary.tag, "foo")
        self.assertEqual(
            tensor_util.make_ndarray(summary.tensor), np.array(42.0)
        )
        self.assertEqual(
            summary.metadata.data_class, summary_pb2.DATA_CLASS_SCALAR
        )
        self.assertEqual(summary.metadata.plugin_data.plugin_name, "scalars")
        self.assertEqual(summary.metadata.summary_description, "fooful")

    def test_basic(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.add_scalar("foo", np.float32(42.0), np.int64(12))
        output.emit_scalar.assert_called_once_with(
            plugin_name="scalars",
            tag="foo",
            data=np.float32(42.0),
            step=np.int64(12),
            wall_time=mock.ANY,
            description=None,
        )
        _, kwargs = output.emit_scalar.call_args
        self.assertEqual(np.float32, type(kwargs["data"]))
        self.assertEqual(np.int64, type(kwargs["step"]))

    def test_accepts_python_types(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.add_scalar("foo", 42.0, 12)
        output.emit_scalar.assert_called_once_with(
            plugin_name="scalars",
            tag="foo",
            data=np.float32(42.0),
            step=np.int64(12),
            wall_time=mock.ANY,
            description=None,
        )
        _, kwargs = output.emit_scalar.call_args
        self.assertEqual(np.float32, type(kwargs["data"]))
        self.assertEqual(np.int64, type(kwargs["step"]))

    def test_validates_data_shape(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        with self.assertRaisesRegex(ValueError, "scalar.*data"):
            w.add_scalar("foo", np.float32([1.0]), 12)

    def test_validates_step_shape(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        with self.assertRaisesRegex(ValueError, "scalar.*step"):
            w.add_scalar("foo", 42.0, np.int64([12]))

    def test_default_wall_time(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        with mock.patch.object(time, "time") as mock_time:
            mock_time.return_value = 12345.678
            w.add_scalar("foo", 42.0, 12)
        output.emit_scalar.assert_called_once()
        _, kwargs = output.emit_scalar.call_args
        self.assertEqual(12345.678, kwargs["wall_time"])

    def test_explicit_wall_time(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.add_scalar("foo", 42.0, 12, wall_time=999.999)
        output.emit_scalar.assert_called_once()
        _, kwargs = output.emit_scalar.call_args
        self.assertEqual(999.999, kwargs["wall_time"])

    def test_explicit_description(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.add_scalar("foo", 42.0, 12, description="fooful")
        output.emit_scalar.assert_called_once()
        _, kwargs = output.emit_scalar.call_args
        self.assertEqual("fooful", kwargs["description"])

    def test_after_close(self):
        output = mock.create_autospec(output_lib.Output)
        w = writer_lib.Writer(output)
        w.close()
        with self.assertRaisesRegex(RuntimeError, "already closed"):
            w.add_scalar("unused", 0.0, 0)


if __name__ == "__main__":
    tb_test.main()
