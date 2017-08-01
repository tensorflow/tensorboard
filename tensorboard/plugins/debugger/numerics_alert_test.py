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
"""Unit tests for numerics_alert."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard.plugins.debugger import constants
from tensorboard.plugins.debugger import numerics_alert


class NumericAlertHistoryTest(tf.test.TestCase):

  def testConstructFromOneAlert(self):
    alert = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 10, 0, 10)
    history = numerics_alert.NumericsAlertHistory()
    history.add(alert)
    self.assertEqual(1234, history.first_timestamp())
    self.assertEqual(1234, history.last_timestamp())
    self.assertEqual(1, history.event_count(constants.NAN_KEY))
    self.assertEqual(0, history.event_count(constants.NEG_INF_KEY))
    self.assertEqual(1, history.event_count(constants.POS_INF_KEY))

  def testAddAlertInChronologicalOrder(self):
    history = numerics_alert.NumericsAlertHistory()
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 10, 0, 10)
    history.add(alert_1)

    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1240, 20, 20, 0)
    history.add(alert_2)

    self.assertEqual(1234, history.first_timestamp())
    self.assertEqual(1240, history.last_timestamp())
    self.assertEqual(2, history.event_count(constants.NAN_KEY))
    self.assertEqual(1, history.event_count(constants.NEG_INF_KEY))
    self.assertEqual(1, history.event_count(constants.POS_INF_KEY))

  def testAddAlertInReverseChronologicalOrder(self):
    history = numerics_alert.NumericsAlertHistory()
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 10, 0, 10)
    history.add(alert_1)

    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1220, 20, 20, 0)
    history.add(alert_2)

    self.assertEqual(1220, history.first_timestamp())
    self.assertEqual(1234, history.last_timestamp())
    self.assertEqual(2, history.event_count(constants.NAN_KEY))
    self.assertEqual(1, history.event_count(constants.NEG_INF_KEY))
    self.assertEqual(1, history.event_count(constants.POS_INF_KEY))


class NumericsAlertRegistryTest(tf.test.TestCase):

  def testNoAlert(self):
    registry = numerics_alert.NumericsAlertRegistry()
    self.assertEqual([], registry.report())

  def testSingleAlert(self):
    alert = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 10, 10)
    registry = numerics_alert.NumericsAlertRegistry()
    registry.register(alert)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 1, 1)],
        registry.report())

  def testMultipleEventsFromSameDeviceAndSameTensor(self):
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 10, 10)
    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1634, 5, 5, 5)
    registry = numerics_alert.NumericsAlertRegistry()
    registry.register(alert_1)
    registry.register(alert_2)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 1, 2, 2)],
        registry.report())

  def testMultipleEventsFromSameDeviceAndDifferentTensor(self):
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "div:0", 1434, 0, 1, 1)
    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 2, 2)
    alert_3 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1634, 3, 3, 3)
    registry = numerics_alert.NumericsAlertRegistry()
    registry.register(alert_1)
    registry.register(alert_2)
    registry.register(alert_3)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 1, 2, 2),
         numerics_alert.NumericsAlertReportRow(
             "/job:worker/replica:0/task:0/gpu:0", "div:0", 1434, 0, 1, 1)],
        registry.report())

  def testMultipleEventsFromDifferentDevicesAndSameTensorName(self):
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1, 1)
    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 1, 1)
    alert_3 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1634, 1, 1, 1)
    registry = numerics_alert.NumericsAlertRegistry()
    registry.register(alert_1)
    registry.register(alert_2)
    registry.register(alert_3)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 1, 2, 2),
         numerics_alert.NumericsAlertReportRow(
             "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1,
             1)], registry.report())

  def testFilterReport(self):
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1, 1)
    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 1, 1)
    alert_3 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Mean:0", 1634, 1, 1, 1)
    registry = numerics_alert.NumericsAlertRegistry()
    registry.register(alert_1)
    registry.register(alert_2)
    registry.register(alert_3)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1, 1)],
        registry.report(device_name_filter=r".*\/task:1\/.*"))
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Mean:0", 1634, 1, 1,
            1)], registry.report(tensor_name_filter=r".*Mean.*"))

  def testRegisterBeyondCapacityObeysCapacity(self):
    alert_1 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1, 1)
    alert_2 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 1, 1)
    alert_3 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:2/gpu:0", "xent/Log:0", 1634, 0, 1, 1)
    alert_4 = numerics_alert.NumericsAlert(
        "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1834, 1, 1, 1)
    registry = numerics_alert.NumericsAlertRegistry(capacity=2)
    registry.register(alert_1)
    registry.register(alert_2)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 1, 1),
         numerics_alert.NumericsAlertReportRow(
             "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1,
             1)], registry.report())

    registry.register(alert_3)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 0, 1, 1),
         numerics_alert.NumericsAlertReportRow(
             "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1,
             1)], registry.report())

    registry.register(alert_4)
    self.assertEqual(
        [numerics_alert.NumericsAlertReportRow(
            "/job:worker/replica:0/task:0/gpu:0", "xent/Log:0", 1234, 1, 2, 2),
         numerics_alert.NumericsAlertReportRow(
             "/job:worker/replica:0/task:1/gpu:0", "xent/Log:0", 1434, 0, 1,
             1)], registry.report())

  def testCreateJsonableRegistry(self):
    alert = numerics_alert.NumericsAlert("/job:worker/replica:0/task:1/gpu:0",
                                         "xent/Log:0", 1434, 0, 1, 1)
    registry = numerics_alert.NumericsAlertRegistry()
    registry.register(alert)

    triplet_list = registry.create_jsonable_registry()
    self.assertEqual(1, len(triplet_list))

    triplet = triplet_list[0]
    self.assertEqual("/job:worker/replica:0/task:1/gpu:0", triplet.device)
    self.assertEqual("xent/Log:0", triplet.tensor)
    self.assertListEqual([0, -1, -1], list(triplet.jsonable_history["nan"]))
    self.assertListEqual([1, 1434, 1434],
                         list(triplet.jsonable_history["neg_inf"]))
    self.assertListEqual([1, 1434, 1434],
                         list(triplet.jsonable_history["pos_inf"]))

  def testLoadFromJson(self):
    registry = numerics_alert.NumericsAlertRegistry(initialization_list=[[
        "/job:localhost/replica:0/task:0/cpu:0", "MatMul:0", {
            "pos_inf": [0, -1, -1],
            "nan": [1624, 1496818651573005, 1496818690371163],
            "neg_inf": [0, -1, -1]
        }
    ], [
        "/job:localhost/replica:0/task:0/cpu:0", "weight/Adagrad:0", {
            "pos_inf": [0, -1, -1],
            "nan": [1621, 1496818651607234, 1496818690370891],
            "neg_inf": [0, -1, -1]
        }
    ]])
    self.assertEqual([
        numerics_alert.NumericsAlertReportRow(
            "/job:localhost/replica:0/task:0/cpu:0", "MatMul:0",
            1496818651573005, 1624, 0, 0),
        numerics_alert.NumericsAlertReportRow(
            "/job:localhost/replica:0/task:0/cpu:0", "weight/Adagrad:0",
            1496818651607234, 1621, 0, 0)
    ], registry.report())

  def testCreateEmptyJsonableRegistry(self):
    """Tests that an empty registry yields an empty report."""
    registry = numerics_alert.NumericsAlertRegistry()
    self.assertEqual([], registry.report())


if __name__ == "__main__":
  tf.test.main()
