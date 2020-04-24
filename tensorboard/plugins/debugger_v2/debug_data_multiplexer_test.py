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

import functools
import threading
import time

import tensorflow as tf

from tensorboard.plugins.debugger_v2 import debug_data_multiplexer

mock = tf.compat.v1.test.mock


class MockThread(object):
    """A mock for threading.Thread for testing."""

    def __init__(self, target, **kwargs):
        self._target = target

    def start(self):
        self._target()


class MockEvent(object):
    """A mock for threading.Event for testing."""

    def __init__(self, num_times):
        self._num_times = num_times
        self._counter = 0
        self.timeouts = []

    def wait(self, timeout):
        self.timeouts.append(timeout)
        self._counter += 1
        # Raises an exception when a specified number of wait() calls have
        # happened, so that a test can terminate.
        if self._counter == self._num_times:
            raise StopIteration()

    def set(self):
        pass


class RunInBackgroundRepeatedlyTest(tf.test.TestCase):
    def testRunInBackgroundRepeatedlyThreeTimes(self):
        mock_target = mock.Mock()
        mock_event = MockEvent(3)
        with mock.patch("threading.Thread", MockThread), mock.patch.object(
            threading, "Event", lambda: mock_event
        ):
            with self.assertRaises(StopIteration):
                debug_data_multiplexer.run_repeatedly_in_background(
                    mock_target, 0.2
                )
            # Check calls to the target.
            self.assertEqual(mock_target.call_count, 3)
            # Check calls to mocked Event.set().
            self.assertEqual(mock_event.timeouts, [0.2, 0.2, 0.2])

    def testRunIsStoppedByReturnedEventSetMethodCall(self):
        mock_target = mock.Mock()
        interrupt_event = debug_data_multiplexer.run_repeatedly_in_background(
            mock_target, 0.1
        )
        interrupt_event.set()


if __name__ == "__main__":
    tf.test.main()
