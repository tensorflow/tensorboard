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

import threading
import time

import tensorflow as tf

from tensorboard.plugins.debugger_v2 import debug_data_multiplexer

mock = tf.compat.v1.test.mock


class RunInBackgroundRepeatedlyTest(tf.test.TestCase):
    def testRunInBackgroundRepeatedlyThreeTimes(self):
        state = {"counter": 0}

        def run_three_times():
            state["counter"] += 1
            if state["counter"] == 3:
                raise StopIteration()

        OriginalThread = threading.Thread
        with mock.patch.object(
            threading,
            "Thread",
            # Use a non-daemon thread for testing. A non-daemon thread
            # will block the test process from exiting if not terminated
            # properly. Here the thread is expected to be terminated by the
            # `StopIteration` raised by `run_three_times()`.
            lambda target, daemon: OriginalThread(target=target, daemon=False),
        ):
            (
                interrupt_event,
                thread,
            ) = debug_data_multiplexer.run_repeatedly_in_background(
                run_three_times,
                None,  # `interval_sec is None` means indefinite wait()
            )
            interrupt_event.set()
            time.sleep(0.05)
            interrupt_event.set()
            time.sleep(0.05)
            interrupt_event.set()
        thread.join()
        self.assertEqual(state["counter"], 3)


class ParseTensorNameTest(tf.test.TestCase):
    def testParseTensorNameWithNoOutputSlot(self):
        op_name, slot = debug_data_multiplexer.parse_tensor_name("MatMul_1")
        self.assertEqual(op_name, "MatMul_1")
        self.assertEqual(slot, 0)

    def testParseTensorNameWithZeroOutputSlot(self):
        op_name, slot = debug_data_multiplexer.parse_tensor_name("MatMul_1:0")
        self.assertEqual(op_name, "MatMul_1")
        self.assertEqual(slot, 0)

    def testParseTensorNameWithNonZeroOutputSlot(self):
        op_name, slot = debug_data_multiplexer.parse_tensor_name("Unpack:10")
        self.assertEqual(op_name, "Unpack")
        self.assertEqual(slot, 10)

    def testParseTensorNameWithInvalidSlotRaisesValueError(self):
        with self.assertRaises(ValueError):
            debug_data_multiplexer.parse_tensor_name("Unpack:10:10")


if __name__ == "__main__":
    tf.test.main()
