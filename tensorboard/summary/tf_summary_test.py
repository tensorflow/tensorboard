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
"""Integration test for exporting TB symbols under the `tf.summary` API.

This checks the integration between TF and TB to verify that the mechanism we
use to export TensorBoard symbols as part of the `tf.summary` API works.

We also test this at an even higher level (and with many different import
sequences) via our pip package build script. But that script is run only in
our external CI, whereas this python test can run anywhere our normal tests run.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import sys
import unittest


class TfSummaryExportTest(unittest.TestCase):

  def test_tf_summary_export(self):
    # Ensure that TF wasn't already imported, since we want this test to cover
    # the entire flow of "import tensorflow; use tf.summary" and if TF was in
    # fact already imported that reduces the comprehensiveness of the test.
    # This means this test has to be kept in its own file and that no other
    # test methods in this file should import tensorflow.
    self.assertEqual('notfound', sys.modules.get('tensorflow', 'notfound'))
    import tensorflow as tf
    if not tf.__version__.startswith('2.'):
      if hasattr(tf, 'compat') and hasattr(tf.compat, 'v2'):
        tf = tf.compat.v2
      else:
        self.skipTest('TF v2 summary API not available')
    # Check that tf.summary contains both TB-provided and TF-provided symbols.
    expected_symbols = frozenset(
        ['scalar', 'image', 'audio', 'histogram', 'text']
        + ['write', 'create_file_writer', 'SummaryWriter'])
    self.assertLessEqual(expected_symbols, frozenset(dir(tf.summary)))
    # Ensure we can dereference symbols as well.
    print(tf.summary.scalar)
    print(tf.summary.write)


if __name__ == '__main__':
  unittest.main()
