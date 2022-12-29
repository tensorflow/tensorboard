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
"""Tests for the audio plugin summary generation functions."""


import glob
import os

import numpy as np
import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.plugins.audio import metadata
from tensorboard.plugins.audio import summary
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

audio_ops = getattr(tf, "audio", None)
if audio_ops is None:
    # Fallback for older versions of TF without tf.audio.
    from tensorflow.python.ops import gen_audio_ops as audio_ops


class SummaryBaseTest:
    def setUp(self):
        super().setUp()
        self.samples_rate = 44100
        self.audio_count = 1
        self.num_samples = 20
        self.num_channels = 2

    def _generate_audio(self, **kwargs):
        size = [
            kwargs.get("k", self.audio_count),
            kwargs.get("n", self.num_samples),
            kwargs.get("c", self.num_channels),
        ]
        return np.sin(
            np.linspace(0.0, 100.0, np.prod(size), dtype=np.float32)
        ).reshape(size)

    def audio(self, *args, **kwargs):
        raise NotImplementedError()

    def test_metadata(self):
        data = np.array(1, np.float32, ndmin=3)
        description = "Piano Concerto No. 23 (K488), in **A major.**"
        pb = self.audio("k488", data, 44100, description=description)
        self.assertEqual(len(pb.value), 1)
        summary_metadata = pb.value[0].metadata
        self.assertEqual(summary_metadata.summary_description, description)
        plugin_data = summary_metadata.plugin_data
        self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
        content = summary_metadata.plugin_data.content
        parsed = metadata.parse_plugin_metadata(content)
        self.assertEqual(parsed.encoding, metadata.Encoding.Value("WAV"))

    def test_wav_format_roundtrip(self):
        audio = self._generate_audio(c=1)
        pb = self.audio("k488", audio, 44100)
        encoded = tensor_util.make_ndarray(pb.value[0].tensor)
        decoded, sample_rate = audio_ops.decode_wav(encoded.flat[0])
        # WAV roundtrip goes from float32 to int16 and back, so expect some
        # precision loss, but not more than 2 applications of rounding error from
        # mapping the range [-1.0, 1.0] to 2^16.
        epsilon = 2 * 2.0 / (2**16)
        self.assertAllClose(audio[0], decoded, atol=epsilon)
        self.assertEqual(44100, sample_rate.numpy())

    def _test_dimensions(self, audio):
        pb = self.audio("k488", audio, 44100)
        self.assertEqual(1, len(pb.value))
        results = tensor_util.make_ndarray(pb.value[0].tensor)
        for i, (encoded, _) in enumerate(results):
            decoded, _ = audio_ops.decode_wav(encoded)
            self.assertEqual(audio[i].shape, decoded.shape)

    def test_dimensions(self):
        # Check mono and stereo.
        self._test_dimensions(self._generate_audio(c=1))
        self._test_dimensions(self._generate_audio(c=2))

    def test_audio_count_zero(self):
        shape = (0, self.num_samples, 2)
        audio = np.array([]).reshape(shape).astype(np.float32)
        pb = self.audio("k488", audio, 44100, max_outputs=3)
        self.assertEqual(1, len(pb.value))
        results = tensor_util.make_ndarray(pb.value[0].tensor)
        self.assertEqual(results.shape, (0, 2))

    def test_audio_count_less_than_max_outputs(self):
        max_outputs = 3
        data = self._generate_audio(k=(max_outputs - 1))
        pb = self.audio("k488", data, 44100, max_outputs=max_outputs)
        self.assertEqual(1, len(pb.value))
        results = tensor_util.make_ndarray(pb.value[0].tensor)
        self.assertEqual(results.shape, (len(data), 2))

    def test_audio_count_when_more_than_max(self):
        max_outputs = 3
        data = self._generate_audio(k=(max_outputs + 1))
        pb = self.audio("k488", data, 44100, max_outputs=max_outputs)
        self.assertEqual(1, len(pb.value))
        results = tensor_util.make_ndarray(pb.value[0].tensor)
        self.assertEqual(results.shape, (max_outputs, 2))

    def test_requires_nonnegative_max_outputs(self):
        data = np.array(1, np.float32, ndmin=3)
        with self.assertRaisesRegex(
            (ValueError, tf.errors.InvalidArgumentError), ">= 0"
        ):
            self.audio("k488", data, 44100, max_outputs=-1)

    def test_requires_rank_3(self):
        with self.assertRaisesRegex(ValueError, "must have rank 3"):
            self.audio("k488", np.array([[1]]), 44100)

    def test_requires_wav(self):
        data = np.array(1, np.float32, ndmin=3)
        with self.assertRaisesRegex(ValueError, "Unknown encoding"):
            self.audio("k488", data, 44100, encoding="pptx")


class SummaryV1PbTest(SummaryBaseTest, tf.test.TestCase):
    def setUp(self):
        super().setUp()

    def audio(self, *args, **kwargs):
        return summary.pb(*args, **kwargs)

    def test_tag(self):
        data = np.array(1, np.float32, ndmin=3)
        self.assertEqual(
            "a/audio_summary", self.audio("a", data, 44100).value[0].tag
        )
        self.assertEqual(
            "a/b/audio_summary", self.audio("a/b", data, 44100).value[0].tag
        )

    def test_requires_nonnegative_max_outputs(self):
        self.skipTest("summary V1 pb does not actually enforce this")


class SummaryV1OpTest(SummaryBaseTest, tf.test.TestCase):
    def setUp(self):
        super().setUp()

    def audio(self, *args, **kwargs):
        return tf.compat.v1.Summary.FromString(
            summary.op(*args, **kwargs).numpy()
        )

    def test_tag(self):
        data = np.array(1, np.float32, ndmin=3)
        self.assertEqual(
            "a/audio_summary", self.audio("a", data, 44100).value[0].tag
        )
        self.assertEqual(
            "a/b/audio_summary", self.audio("a/b", data, 44100).value[0].tag
        )

    def test_scoped_tag(self):
        data = np.array(1, np.float32, ndmin=3)
        with tf.name_scope("scope"):
            self.assertEqual(
                "scope/a/audio_summary",
                self.audio("a", data, 44100).value[0].tag,
            )

    def test_audio_count_zero(self):
        self.skipTest("fails under eager because map_fn() returns float dtype")

    def test_requires_nonnegative_max_outputs(self):
        self.skipTest("summary V1 op does not actually enforce this")


class SummaryV2OpTest(SummaryBaseTest, tf.test.TestCase):
    def setUp(self):
        super().setUp()
        if tf2 is None:
            self.skipTest("TF v2 summary API not available")

    def audio(self, *args, **kwargs):
        return self.audio_event(*args, **kwargs).summary

    def audio_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            summary.audio(*args, **kwargs)
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
        data = np.array(1, np.float32, ndmin=3)
        with tf.name_scope("scope"):
            self.assertEqual(
                "scope/a", self.audio("a", data, 44100).value[0].tag
            )

    def test_step(self):
        data = np.array(1, np.float32, ndmin=3)
        event = self.audio_event("a", data, 44100, step=333)
        self.assertEqual(333, event.step)

    def test_default_step(self):
        data = np.array(1, np.float32, ndmin=3)
        try:
            tf2.summary.experimental.set_step(333)
            # TODO(nickfelt): change test logic so we can just omit `step` entirely.
            event = self.audio_event("a", data, 44100, step=None)
            self.assertEqual(333, event.step)
        finally:
            # Reset to default state for other tests.
            tf2.summary.experimental.set_step(None)


if __name__ == "__main__":
    tf.test.main()
