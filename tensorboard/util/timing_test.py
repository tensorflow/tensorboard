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
"""Tests for tensorboard.util.timing."""

import contextlib

from tensorboard import test as tb_test
from tensorboard.util import tb_logging
from tensorboard.util import timing

logger = tb_logging.get_logger()


class LogLatencyTest(tb_test.TestCase):
    """Tests for `log_latency`."""

    @contextlib.contextmanager
    def assert_logs_matching(self, needle):
        with self.assertLogs() as cm:
            yield
        if not any(needle in line for line in cm.output):
            self.fail(
                "Expected a log line containing %r, but got:\n%s"
                % (needle, "\n".join(cm.output))
            )

    def my_slow_function(self):
        # For test cases to decorate. (Defining this inside a test case
        # gives it an ugly qualname.)
        pass

    def test_decorator_implicit_name(self):
        decorated = timing.log_latency(self.my_slow_function)
        with self.assert_logs_matching("ENTER LogLatencyTest.my_slow_function"):
            decorated()
        # Again: make sure it's reusable.
        with self.assert_logs_matching("ENTER LogLatencyTest.my_slow_function"):
            decorated()

    def test_decorator_explicit_name(self):
        decorated = timing.log_latency("my_costly_block")(self.my_slow_function)
        with self.assert_logs_matching("ENTER my_costly_block"):
            decorated()

    def test_context_manager_explicit_name(self):
        with self.assert_logs_matching("ENTER my_slow_region"):
            with timing.log_latency("my_slow_region"):
                pass


if __name__ == "__main__":
    tb_test.main()
