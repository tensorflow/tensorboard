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
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import threading

import tensorflow as tf

from tensorboard.plugins.debugger_v2 import debug_data_multiplexer


class MockThread(object):
    """A mock for threading.Thread for testing."""

    def __init__(self, target):
        self._target = target

    def start(self):
        self._target()


class DebuggerV2PluginTest(tf.test.TestCase):
    def testRunInBackground(self):
        mock_target = tf.compat.v1.test.mock.Mock()
        with tf.compat.v1.test.mock.patch("threading.Thread", MockThread):
            debug_data_multiplexer.run_in_background(mock_target)
            mock_target.assert_called_once()


if __name__ == "__main__":
    tf.test.main()
