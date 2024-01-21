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
# ==============================================================================
"""Tests for tensorboard.uploader.util."""


from unittest import mock

from tensorboard.uploader import util
from tensorboard import test as tb_test


class FakeTime:
    """Fake replacement for the `time` module."""

    def __init__(self, current=0.0):
        self._time = float(current)

    def time(self):
        return self._time

    def sleep(self, secs):
        self._time += secs


class RateLimiterTest(tb_test.TestCase):
    def test_rate_limiting(self):
        rate_limiter = util.RateLimiter(10)
        fake_time = FakeTime(current=1000)
        with mock.patch.object(rate_limiter, "_time", fake_time):
            self.assertEqual(1000, fake_time.time())
            # No sleeping for initial tick.
            rate_limiter.tick()
            self.assertEqual(1000, fake_time.time())
            # Second tick requires a full sleep.
            rate_limiter.tick()
            self.assertEqual(1010, fake_time.time())
            # Third tick requires a sleep just to make up the remaining second.
            fake_time.sleep(9)
            self.assertEqual(1019, fake_time.time())
            rate_limiter.tick()
            self.assertEqual(1020, fake_time.time())
            # Fourth tick requires no sleep since we have no remaining seconds.
            fake_time.sleep(11)
            self.assertEqual(1031, fake_time.time())
            rate_limiter.tick()
            self.assertEqual(1031, fake_time.time())


if __name__ == "__main__":
    tb_test.main()
