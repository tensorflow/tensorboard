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
"""Utilities for use by the uploader command line tool."""

import time


class RateLimiter:
    """Helper class for rate-limiting using a fixed minimum interval."""

    def __init__(self, interval_secs):
        """Constructs a RateLimiter that permits a tick() every
        `interval_secs`."""
        self._time = time  # Use property for ease of testing.
        self._interval_secs = interval_secs
        self._last_called_secs = 0

    def tick(self):
        """Blocks until it has been at least `interval_secs` since last
        tick()."""
        wait_secs = (
            self._last_called_secs + self._interval_secs - self._time.time()
        )
        if wait_secs > 0:
            self._time.sleep(wait_secs)
        self._last_called_secs = self._time.time()
