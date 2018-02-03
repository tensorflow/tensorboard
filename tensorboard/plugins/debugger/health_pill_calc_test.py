# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for health_pill_calc."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from tensorboard.plugins.debugger import health_pill_calc


class HealthPillCalcTest(tf.test.TestCase):

  def testInfOnlyArray(self):
    x = np.array([[np.inf, -np.inf], [np.inf, np.inf]])
    health_pill = health_pill_calc.calc_health_pill(x)
    self.assertEqual(16, len(health_pill))
    self.assertEqual(1.0, health_pill[0])  # Is initialized.
    self.assertEqual(4.0, health_pill[1])  # numel.
    self.assertEqual(0, health_pill[2])  # NaN count.
    self.assertEqual(1, health_pill[3])  # -Infinity count.
    self.assertEqual(0, health_pill[4])  # Finite negative count.
    self.assertEqual(0, health_pill[5])  # Zero count.
    self.assertEqual(0, health_pill[6])  # Finite positive count.
    self.assertEqual(3, health_pill[7])  # +Infinity count.
    self.assertEqual(np.inf, health_pill[8])
    self.assertEqual(-np.inf, health_pill[9])
    self.assertTrue(np.isnan(health_pill[10]))
    self.assertTrue(np.isnan(health_pill[11]))
    self.assertEqual(2, health_pill[13])  # Number of dimensions.
    self.assertEqual(2, health_pill[14])  # Size is (2, 2).
    self.assertEqual(2, health_pill[15])

  def testNanOnlyArray(self):
    x = np.array([[np.nan, np.nan, np.nan]])
    health_pill = health_pill_calc.calc_health_pill(x)
    self.assertEqual(16, len(health_pill))
    self.assertEqual(1, health_pill[0])  # Is initialized.
    self.assertEqual(3, health_pill[1])  # numel.
    self.assertEqual(3, health_pill[2])  # NaN count.
    self.assertEqual(0, health_pill[3])  # -Infinity count.
    self.assertEqual(0, health_pill[4])  # Finite negative count.
    self.assertEqual(0, health_pill[5])  # Zero count.
    self.assertEqual(0, health_pill[6])  # Finite positive count.
    self.assertEqual(0, health_pill[7])  # +Infinity count.
    self.assertEqual(np.inf, health_pill[8])
    self.assertEqual(-np.inf, health_pill[9])
    self.assertTrue(np.isnan(health_pill[10]))
    self.assertTrue(np.isnan(health_pill[11]))
    self.assertEqual(2, health_pill[13])  # Number of dimensions.
    self.assertEqual(1, health_pill[14])  # Size is (1, 3)
    self.assertEqual(3, health_pill[15])

  def testInfAndNanOnlyArray(self):
    x = np.array([np.inf, -np.inf, np.nan])
    health_pill = health_pill_calc.calc_health_pill(x)
    self.assertEqual(15, len(health_pill))
    self.assertEqual(1, health_pill[0])  # Is initialized.
    self.assertEqual(3, health_pill[1])  # numel.
    self.assertEqual(1, health_pill[2])  # NaN count.
    self.assertEqual(1, health_pill[3])  # -Infinity count.
    self.assertEqual(0, health_pill[4])  # Finite negative count.
    self.assertEqual(0, health_pill[5])  # Zero count.
    self.assertEqual(0, health_pill[6])  # Finite positive count.
    self.assertEqual(1, health_pill[7])  # +Infinity count.
    self.assertEqual(np.inf, health_pill[8])
    self.assertEqual(-np.inf, health_pill[9])
    self.assertTrue(np.isnan(health_pill[10]))
    self.assertTrue(np.isnan(health_pill[11]))
    self.assertEqual(1, health_pill[13])  # Number of dimensions.
    self.assertEqual(3, health_pill[14])  # Size is (3,).

  def testEmptyArray(self):
    x = np.array([[], []])
    health_pill = health_pill_calc.calc_health_pill(x)
    self.assertEqual(16, len(health_pill))
    self.assertEqual(1, health_pill[0])  # Is initialized.
    self.assertEqual(0, health_pill[1])  # numel.
    self.assertEqual(0, health_pill[2])  # NaN count.
    self.assertEqual(0, health_pill[3])  # -Infinity count.
    self.assertEqual(0, health_pill[4])  # Finite negative count.
    self.assertEqual(0, health_pill[5])  # Zero count.
    self.assertEqual(0, health_pill[6])  # Finite positive count.
    self.assertEqual(0, health_pill[7])  # +Infinity count.
    self.assertEqual(np.inf, health_pill[8])
    self.assertEqual(-np.inf, health_pill[9])
    self.assertTrue(np.isnan(health_pill[10]))
    self.assertTrue(np.isnan(health_pill[11]))
    self.assertEqual(2, health_pill[13])  # Number of dimensions.
    self.assertEqual(2, health_pill[14])  # Size is (2, 0).
    self.assertEqual(0, health_pill[15])

  def testScalar(self):
    x = np.array(-1337.0)
    health_pill = health_pill_calc.calc_health_pill(x)
    self.assertEqual(14, len(health_pill))
    self.assertEqual(1, health_pill[0])  # Is initialized.
    self.assertEqual(1, health_pill[1])  # numel.
    self.assertEqual(0, health_pill[2])  # NaN count.
    self.assertEqual(0, health_pill[3])  # -Infinity count.
    self.assertEqual(1, health_pill[4])  # Finite negative count.
    self.assertEqual(0, health_pill[5])  # Zero count.
    self.assertEqual(0, health_pill[6])  # Finite positive count.
    self.assertEqual(0, health_pill[7])  # +Infinity count.
    self.assertEqual(-1337.0, health_pill[8])
    self.assertEqual(-1337.0, health_pill[9])
    self.assertEqual(-1337.0, health_pill[10])
    self.assertEqual(0, health_pill[11])
    self.assertEqual(0, health_pill[13])  # Number of dimensions.


if __name__ == "__main__":
  tf.test.main()
