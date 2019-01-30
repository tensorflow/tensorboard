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
"""Dependency tests for the `tensorboard.summary` APIs.

This test is isolated in its own file to avoid depending on TensorFlow (either
directly or transitively), since we need to test the *absence* of a TF dep.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import sys
import unittest


class SummaryV2DepTest(unittest.TestCase):

  def test_summary_v2_has_no_immediate_tf_dep(self):
    # Check that we can import the module (multiple ways) and list and reference
    # symbols from it without triggering a tensorflow import.
    import tensorboard.summary.v2
    from tensorboard.summary import v2 as summary_v2
    print(dir(summary_v2))
    print(summary_v2.scalar)
    self.assertEqual('notfound', sys.modules.get('tensorflow', 'notfound'))


if __name__ == '__main__':
  unittest.main()
