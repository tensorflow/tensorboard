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


import tensorflow as tf

from tensorboard.plugins.distribution import compressor


def _make_expected_value(*values):
    return [
        compressor.CompressedHistogramValue(bp, val).as_tuple()
        for bp, val in values
    ]


class CompressorTest(tf.test.TestCase):
    def test_example(self):
        bps = (0, 2500, 5000, 7500, 10000)
        buckets = [[0, 1, 0], [1, 2, 3], [2, 3, 0]]
        self.assertEqual(
            _make_expected_value(
                (0, 0.0),
                (2500, 0.5),
                (5000, 1.0),
                (7500, 1.5),
                (10000, 3.0),
            ),
            compressor.compress_histogram(buckets, bps),
        )

    def test_another_example(self):
        bps = (0, 2500, 5000, 7500, 10000)
        buckets = [[1, 2, 1], [2, 3, 3], [3, 4, 0]]
        self.assertEqual(
            _make_expected_value(
                (0, 1.0),
                (2500, 2.0),
                (5000, 2.0 + 1 / 3),
                (7500, 2.0 + 2 / 3),
                (10000, 4.0),
            ),
            compressor.compress_histogram(buckets, bps),
        )

    def test_empty(self):
        bps = (0, 2500, 5000, 7500, 10000)
        buckets = [[0, 1, 0], [1, 2, 0], [2, 3, 0]]
        self.assertEqual(
            _make_expected_value(
                (0, 3.0),
                (2500, 3.0),
                (5000, 3.0),
                (7500, 3.0),
                (10000, 3.0),
            ),
            compressor.compress_histogram(buckets, bps),
        )

    def test_ugly(self):
        input_bps = (0, 668, 1587, 3085, 5000, 6915, 8413, 9332, 10000)
        bucket_limits = [
            -1.0,
            0.0,
            0.917246389039776,
            1.0089710279437536,
            1.7976931348623157e308,
        ]
        bucket_counts = [0.0, 896.0, 0.0, 64.0]
        assert len(bucket_counts) == len(bucket_limits) - 1
        buckets = list(
            zip(*[bucket_limits[:-1], bucket_limits[1:], bucket_counts])
        )
        vals = compressor.compress_histogram(buckets, input_bps)
        (bps, values) = zip(*vals)
        self.assertSequenceEqual(bps, input_bps)
        self.assertAlmostEqual(values[0], -1.0)
        self.assertAlmostEqual(values[1], -0.86277993701301037)
        self.assertAlmostEqual(values[2], -0.67399964077791519)
        self.assertAlmostEqual(values[3], -0.36628159533703131)
        self.assertAlmostEqual(values[4], 0.027096279842737214)
        self.assertAlmostEqual(values[5], 0.42047415502250551)
        self.assertAlmostEqual(values[6], 0.72819220046338917)
        self.assertAlmostEqual(values[7], 0.91697249669848446)
        self.assertAlmostEqual(values[8], 1.7976931348623157e308)


if __name__ == "__main__":
    tf.test.main()
