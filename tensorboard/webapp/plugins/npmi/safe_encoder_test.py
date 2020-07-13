# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for the safe encoder."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json

import numpy as np
import tensorflow as tf

from tensorboard.webapp.plugins.npmi import safe_encoder


class SafeEncoderTest(tf.test.TestCase):
    def setUp(self):
        super(SafeEncoderTest, self).setUp()

    def testNaN(self):
        nan_encoded = json.dumps(
            {"test": np.nan}, cls=safe_encoder.SafeEncoder)
        self.assertEqual(nan_encoded, "{\"test\": null}")

    def testInf(self):
        inf_encoded = json.dumps(
            {"test": np.inf}, cls=safe_encoder.SafeEncoder)
        self.assertEqual(inf_encoded, "{\"test\": Infinity}")

    def testNegInf(self):
        neg_inf_encoded = json.dumps(
            {"test": np.NINF}, cls=safe_encoder.SafeEncoder)
        self.assertEqual(neg_inf_encoded, "{\"test\": -Infinity}")


if __name__ == "__main__":
    tf.test.main()
