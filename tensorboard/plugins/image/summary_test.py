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
"""Tests for the image plugin summary generation functions."""


import glob
import os

import numpy as np
import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.image import metadata
from tensorboard.plugins.image import summary

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
    def setUp(self):
        super().setUp()
        np.random.seed(0)
        self.image_width = 20
        self.image_height = 15
        self.image_count = 1
        self.image_channels = 3

    def _generate_images(self, **kwargs):
        size = [
            kwargs.get("n", self.image_count),
            kwargs.get("h", self.image_height),
            kwargs.get("w", self.image_width),
            kwargs.get("c", self.image_channels),
        ]
        return np.random.uniform(low=0, high=255, size=size).astype(np.uint8)

    def image(self, *args, **kwargs):
        raise NotImplementedError()

    def test_tag(self):
        data = np.array(1, np.uint8, ndmin=4)
        self.assertEqual("a", self.image("a", data).value[0].tag)
        self.assertEqual("a/b", self.image("a/b", data).value[0].tag)

    def test_metadata(self):
        data = np.array(1, np.uint8, ndmin=4)
        description = "By Leonardo da Vinci"
        pb = self.image("mona_lisa", data, description=description)
        summary_metadata = pb.value[0].metadata
        self.assertEqual(summary_metadata.summary_description, description)
        plugin_data = summary_metadata.plugin_data
        self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
        content = summary_metadata.plugin_data.content
        # There's no content, so successfully parsing is fine.
        metadata.parse_plugin_metadata(content)

    def test_png_format_roundtrip(self):
        images = self._generate_images(c=1)
        pb = self.image("mona_lisa", images)
        encoded = pb.value[0].tensor.string_val[2]  # skip width, height
        self.assertAllEqual(images[0], tf.image.decode_png(encoded))

    def _test_dimensions(self, images):
        pb = self.image("mona_lisa", images)
        self.assertEqual(1, len(pb.value))
        result = pb.value[0].tensor.string_val
        # Check annotated dimensions.
        self.assertEqual(tf.compat.as_bytes(str(self.image_width)), result[0])
        self.assertEqual(tf.compat.as_bytes(str(self.image_height)), result[1])
        for i, encoded in enumerate(result[2:]):
            decoded = tf.image.decode_png(encoded)
            self.assertEqual(images[i].shape, decoded.shape)

    def test_dimensions(self):
        self._test_dimensions(self._generate_images(c=1))
        self._test_dimensions(self._generate_images(c=2))
        self._test_dimensions(self._generate_images(c=3))
        self._test_dimensions(self._generate_images(c=4))

    def test_image_count_zero(self):
        shape = (0, self.image_height, self.image_width, 3)
        data = np.array([], np.uint8).reshape(shape)
        pb = self.image("mona_lisa", data, max_outputs=3)
        self.assertEqual(1, len(pb.value))
        result = pb.value[0].tensor.string_val
        self.assertEqual(tf.compat.as_bytes(str(self.image_width)), result[0])
        self.assertEqual(tf.compat.as_bytes(str(self.image_height)), result[1])
        self.assertEqual(2, len(result))

    def test_image_count_less_than_max_outputs(self):
        max_outputs = 3
        data = self._generate_images(n=(max_outputs - 1))
        pb = self.image("mona_lisa", data, max_outputs=max_outputs)
        self.assertEqual(1, len(pb.value))
        result = pb.value[0].tensor.string_val
        image_results = result[2:]  # skip width, height
        self.assertEqual(len(data), len(image_results))

    def test_image_count_more_than_max_outputs(self):
        max_outputs = 3
        data = self._generate_images(n=(max_outputs + 1))
        pb = self.image("mona_lisa", data, max_outputs=max_outputs)
        self.assertEqual(1, len(pb.value))
        result = pb.value[0].tensor.string_val
        image_results = result[2:]  # skip width, height
        self.assertEqual(max_outputs, len(image_results))

    def test_requires_nonnegative_max_outputs(self):
        data = np.array(1, np.uint8, ndmin=4)
        with self.assertRaisesRegex(
            (ValueError, tf.errors.InvalidArgumentError), ">= 0"
        ):
            self.image("mona_lisa", data, max_outputs=-1)

    def test_requires_rank_4(self):
        with self.assertRaisesRegex(ValueError, "must have rank 4"):
            self.image("mona_lisa", [[[1], [2]], [[3], [4]]])


class SummaryV1PbTest(SummaryBaseTest, tf.test.TestCase):
    def image(self, *args, **kwargs):
        return summary.pb(*args, **kwargs)

    def test_tag(self):
        data = np.array(1, np.uint8, ndmin=4)
        self.assertEqual("a/image_summary", self.image("a", data).value[0].tag)
        self.assertEqual(
            "a/b/image_summary", self.image("a/b", data).value[0].tag
        )

    def test_requires_nonnegative_max_outputs(self):
        self.skipTest("summary V1 pb does not actually enforce this")


class SummaryV1OpTest(SummaryBaseTest, tf.test.TestCase):
    def image(self, *args, **kwargs):
        args = list(args)
        # Force first argument to tf.uint8 since the V1 version requires this.
        args[1] = tf.cast(tf.constant(args[1]), tf.uint8)
        return summary_pb2.Summary.FromString(
            summary.op(*args, **kwargs).numpy()
        )

    def test_tag(self):
        data = np.array(1, np.uint8, ndmin=4)
        self.assertEqual("a/image_summary", self.image("a", data).value[0].tag)
        self.assertEqual(
            "a/b/image_summary", self.image("a/b", data).value[0].tag
        )

    def test_scoped_tag(self):
        data = np.array(1, np.uint8, ndmin=4)
        with tf.name_scope("scope"):
            self.assertEqual(
                "scope/a/image_summary", self.image("a", data).value[0].tag
            )

    def test_image_count_zero(self):
        self.skipTest("fails under eager because map_fn() returns float dtype")


class SummaryV2OpTest(SummaryBaseTest, tf.test.TestCase):
    def setUp(self):
        super().setUp()
        if tf2 is None:
            self.skipTest("TF v2 summary API not available")

    def image(self, *args, **kwargs):
        return self.image_event(*args, **kwargs).summary

    def image_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            summary.image(*args, **kwargs)
        writer.close()
        event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), "*")))
        self.assertEqual(len(event_files), 1)
        events = list(tf.compat.v1.train.summary_iterator(event_files[0]))
        # Expect a boilerplate event for the file_version, then the summary one.
        self.assertEqual(len(events), 2)
        # Delete the event file to reset to an empty directory for later calls.
        # TODO(nickfelt): use a unique subdirectory per writer instead.
        os.remove(event_files[0])
        return events[1]

    def test_scoped_tag(self):
        data = np.array(1, np.uint8, ndmin=4)
        with tf.name_scope("scope"):
            self.assertEqual("scope/a", self.image("a", data).value[0].tag)

    def test_step(self):
        data = np.array(1, np.uint8, ndmin=4)
        event = self.image_event("a", data, step=333)
        self.assertEqual(333, event.step)

    def test_default_step(self):
        data = np.array(1, np.uint8, ndmin=4)
        try:
            tf2.summary.experimental.set_step(333)
            # TODO(nickfelt): change test logic so we can just omit `step` entirely.
            event = self.image_event("a", data, step=None)
            self.assertEqual(333, event.step)
        finally:
            # Reset to default state for other tests.
            tf2.summary.experimental.set_step(None)

    def test_floating_point_data(self):
        data = np.array([-0.01, 0.0, 0.9, 1.0, 1.1]).reshape((1, -1, 1, 1))
        pb = self.image("mona_lisa", data)
        encoded = pb.value[0].tensor.string_val[2]  # skip width, height
        decoded = tf.image.decode_png(encoded).numpy()
        # Float values outside [0, 1) are truncated, and everything is scaled to the
        # range [0, 255] with 229 = 0.9 * 255, truncated.
        self.assertAllEqual([0, 0, 229, 255, 255], list(decoded.flat))

    def test_vector_data(self):
        data = np.array(
            [
                [-0.01, 0.0, 0.9, 1.0, 1.1],
                [-0.01, 0.0, 1.0, 0.9, 1.1],
            ]
        ).reshape((2, -1, 1, 1))
        pb = self.image("mona_lisa", data)

        encoded0 = pb.value[0].tensor.string_val[2]  # skip width, height
        decoded0 = tf.image.decode_png(encoded0).numpy()
        # Float values outside [0, 1) are truncated, and everything is scaled to the
        # range [0, 255] with 229 = 0.9 * 255, truncated.
        self.assertAllEqual([0, 0, 229, 255, 255], list(decoded0.flat))

        encoded1 = pb.value[0].tensor.string_val[3]  # skip width, height
        decoded1 = tf.image.decode_png(encoded1).numpy()
        self.assertAllEqual([0, 0, 255, 229, 255], list(decoded1.flat))


if __name__ == "__main__":
    tf.test.main()
