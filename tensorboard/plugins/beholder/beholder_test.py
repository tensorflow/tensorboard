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
"""Tests for some very basic Beholder functionality."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
from tensorboard.plugins import beholder
from tensorboard.util import test_util
import tensorflow as tf


class BeholderTest(tf.test.TestCase):
    def setUp(self):
        self._current_time_seconds = 1554232353

    def advance_time(self, delta_seconds):
        self._current_time_seconds += delta_seconds

    def get_time(self):
        return self._current_time_seconds

    @test_util.run_v1_only("Requires sessions")
    def test_update(self):
        with tf.test.mock.patch("time.time", self.get_time):
            b = beholder.Beholder(self.get_temp_dir())
            array = np.array([[0, 1], [1, 0]])
            with tf.Session() as sess:
                v = tf.Variable([0, 0], trainable=True)
                sess.run(tf.global_variables_initializer())
                # Beholder only updates if at least one frame has passed. The
                # default FPS value is 10, but in any case 100 seconds ought to
                # do it.
                self.advance_time(delta_seconds=100)
                b.update(session=sess, arrays=[array])


if __name__ == "__main__":
    tf.test.main()
