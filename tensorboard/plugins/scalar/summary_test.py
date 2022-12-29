# -*- coding: utf-8 -*-
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
"""Tests for the scalar plugin summary API."""


import glob
import os


import numpy as np
import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.scalar import metadata
from tensorboard.plugins.scalar import summary
from tensorboard.util import tensor_util

try:
    tf2.__version__  # Force lazy import to resolve
except ImportError:
    tf2 = None

try:
    tf.compat.v1.enable_eager_execution()
except AttributeError:
    # TF 2.0 doesn't have this symbol because eager is the default.
    pass


class SummaryBaseTest:
    def scalar(self, *args, **kwargs):
        raise NotImplementedError()

    def test_tag(self):
        self.assertEqual("a", self.scalar("a", 1).value[0].tag)
        self.assertEqual("a/b", self.scalar("a/b", 1).value[0].tag)

    def test_metadata(self):
        pb = self.scalar("a", 1.13)
        summary_metadata = pb.value[0].metadata
        plugin_data = summary_metadata.plugin_data
        self.assertEqual(summary_metadata.summary_description, "")
        self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
        content = summary_metadata.plugin_data.content
        # There's no content, so successfully parsing is fine.
        metadata.parse_plugin_metadata(content)

    def test_explicit_description(self):
        description = "The first letter of the alphabet."
        pb = self.scalar("a", 1.13, description=description)
        summary_metadata = pb.value[0].metadata
        self.assertEqual(summary_metadata.summary_description, description)
        plugin_data = summary_metadata.plugin_data
        self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
        content = summary_metadata.plugin_data.content
        # There's no content, so successfully parsing is fine.
        metadata.parse_plugin_metadata(content)

    def test_float_value(self):
        pb = self.scalar("a", 1.13)
        value = tensor_util.make_ndarray(pb.value[0].tensor).item()
        self.assertEqual(float, type(value))
        self.assertNear(1.13, value, 1e-6)

    def test_int_value(self):
        # ints should be valid, but converted to floats.
        pb = self.scalar("a", 113)
        value = tensor_util.make_ndarray(pb.value[0].tensor).item()
        self.assertEqual(float, type(value))
        self.assertNear(113.0, value, 1e-6)

    def test_bool_value(self):
        # bools should be valid, but converted to floats.
        pb = self.scalar("a", True)
        value = tensor_util.make_ndarray(pb.value[0].tensor).item()
        self.assertEqual(float, type(value))
        self.assertEqual(1.0, value)

    def test_string_value(self):
        # Use str.* in regex because PY3 numpy refers to string arrays using
        # length-dependent type names in the format "str%d" % (32 * len(str)).
        with self.assertRaisesRegex(
            (ValueError, tf.errors.UnimplementedError), r"Cast str.*float"
        ):
            self.scalar("a", np.array("113"))

    def test_requires_rank_0(self):
        with self.assertRaisesRegex(ValueError, r"Expected scalar shape"):
            self.scalar("a", np.array([1, 1, 3]))


class SummaryV1PbTest(SummaryBaseTest, tf.test.TestCase):
    def scalar(self, *args, **kwargs):
        return summary.pb(*args, **kwargs)

    def test_tag(self):
        self.assertEqual("a/scalar_summary", self.scalar("a", 1).value[0].tag)
        self.assertEqual(
            "a/b/scalar_summary", self.scalar("a/b", 1).value[0].tag
        )


class SummaryV1OpTest(SummaryBaseTest, tf.test.TestCase):
    def scalar(self, *args, **kwargs):
        return summary_pb2.Summary.FromString(
            summary.op(*args, **kwargs).numpy()
        )

    def test_tag(self):
        self.assertEqual("a/scalar_summary", self.scalar("a", 1).value[0].tag)
        self.assertEqual(
            "a/b/scalar_summary", self.scalar("a/b", 1).value[0].tag
        )

    def test_scoped_tag(self):
        with tf.name_scope("scope"):
            self.assertEqual(
                "scope/a/scalar_summary", self.scalar("a", 1).value[0].tag
            )


class SummaryV2PbTest(SummaryBaseTest, tf.test.TestCase):
    def scalar(self, *args, **kwargs):
        return summary.scalar_pb(*args, **kwargs)


class SummaryV2OpTest(SummaryBaseTest, tf.test.TestCase):
    def setUp(self):
        super().setUp()
        if tf2 is None:
            self.skipTest("v2 summary API not available")

    def scalar(self, *args, **kwargs):
        return self.scalar_event(*args, **kwargs).summary

    def scalar_event(self, *args, **kwargs):
        self.write_scalar_event(*args, **kwargs)
        event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), "*")))
        self.assertEqual(len(event_files), 1)
        events = list(tf.compat.v1.train.summary_iterator(event_files[0]))
        # Expect a boilerplate event for the file_version, then the summary one.
        self.assertEqual(len(events), 2)
        # Delete the event file to reset to an empty directory for later calls.
        # TODO(nickfelt): use a unique subdirectory per writer instead.
        os.remove(event_files[0])
        return events[1]

    def write_scalar_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            summary.scalar(*args, **kwargs)
        writer.close()

    def test_scoped_tag(self):
        with tf.name_scope("scope"):
            self.assertEqual("scope/a", self.scalar("a", 1).value[0].tag)

    def test_step(self):
        event = self.scalar_event("a", 1.0, step=333)
        self.assertEqual(333, event.step)

    def test_default_step(self):
        try:
            tf2.summary.experimental.set_step(333)
            # TODO(nickfelt): change test logic so we can just omit `step` entirely.
            event = self.scalar_event("a", 1.0, step=None)
            self.assertEqual(333, event.step)
        finally:
            # Reset to default state for other tests.
            tf2.summary.experimental.set_step(None)


class SummaryV2OpGraphTest(SummaryV2OpTest, tf.test.TestCase):
    def write_scalar_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        # Hack to extract current scope since there's no direct API for it.
        with tf.name_scope("_") as temp_scope:
            scope = temp_scope.rstrip("/_")

        @tf2.function
        def graph_fn():
            # Recreate the active scope inside the defun since it won't propagate.
            with tf.name_scope(scope):
                summary.scalar(*args, **kwargs)

        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            graph_fn()
        writer.close()


if __name__ == "__main__":
    tf.test.main()
