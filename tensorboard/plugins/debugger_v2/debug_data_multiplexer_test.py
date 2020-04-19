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
import time

import tensorflow as tf

from tensorboard.plugins.debugger_v2 import debug_data_multiplexer

mock = tf.compat.v1.test.mock


class MockThread(object):
    """A mock for threading.Thread for testing."""

    def __init__(self, target):
        self._target = target

    def start(self):
        self._target()


class DebuggerV2PluginTest(tf.test.TestCase):
    def testRunInBackgroundRepeatedly(self):
        mock_target = mock.Mock()
        sleep_state = {"time_values": []}

        def mock_sleep(time):
            sleep_state["time_values"].append(time)
            if len(sleep_state["time_values"]) == 10:
                raise StopIteration()

        with mock.patch("threading.Thread", MockThread), mock.patch.object(
            time, "sleep", mock_sleep
        ):
            with self.assertRaises(StopIteration):
                debug_data_multiplexer.run_repeatedly_in_background(mock_target)
            self.assertEqual(mock_target.call_count, 10)
            self.assertEqual(
                sleep_state["time_values"],
                [debug_data_multiplexer.DEFAULT_RELOAD_INTERVAL_SEC] * 10,
            )


if __name__ == "__main__":
    tf.test.main()
