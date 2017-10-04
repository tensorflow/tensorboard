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
"""Tests the EventsWriterManager."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json

import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger import debugger_plugin_testlib
from tensorboard.plugins.debugger import numerics_alert


class DebuggerPluginTest(debugger_plugin_testlib.DebuggerPluginTestBase):

  def testHealthPillsRouteProvided(self):
    """Tests that the plugin offers the route for requesting health pills."""
    apps = self.plugin.get_plugin_apps()
    self.assertIn('/health_pills', apps)
    self.assertIsInstance(apps['/health_pills'], collections.Callable)

  def testHealthPillsPluginIsActive(self):
    # The multiplexer has sampled health pills.
    self.assertTrue(self.plugin.is_active())

  def testHealthPillsPluginIsInactive(self):
    plugin = self.debugger_plugin_module.DebuggerPlugin(
        base_plugin.TBContext(
            logdir=self.log_dir,
            multiplexer=event_multiplexer.EventMultiplexer({})))
    plugin.listen(self.debugger_data_server_grpc_port)

    # The multiplexer lacks sampled health pills.
    self.assertFalse(plugin.is_active())

  def testRequestHealthPillsForRunFoo(self):
    """Tests that the plugin produces health pills for a specified run."""
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps(['layers/Variable', 'unavailable_node']),
            'run': 'run_foo',
        })
    self.assertEqual(200, response.status_code)
    self.assertDictEqual({
        'layers/Variable': [{
            'wall_time': 4242,
            'step': 42,
            'device_name': '/job:localhost/replica:0/task:0/cpu:0',
            'node_name': 'layers/Variable',
            'output_slot': 0,
            'dtype': 'tf.int16',
            'shape': [8.0],
            'value': list(range(12)) + [tf.int16.as_datatype_enum, 1.0, 8.0],
        }],
    }, self._DeserializeResponse(response.get_data()))

  def testRequestHealthPillsForDefaultRun(self):
    """Tests that the plugin produces health pills for the default '.' run."""
    # Do not provide a 'run' parameter in POST data.
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps(['logits/Add', 'unavailable_node']),
        })
    self.assertEqual(200, response.status_code)
    # The health pills for 'layers/Matmul' should not be included since the
    # request excluded that node name.
    self.assertDictEqual({
        'logits/Add': [
            {
                'wall_time': 1337,
                'step': 7,
                'device_name': '/job:localhost/replica:0/task:0/cpu:0',
                'node_name': 'logits/Add',
                'output_slot': 0,
                'dtype': 'tf.int32',
                'shape': [3.0, 3.0],
                'value': (list(range(12)) +
                          [float(tf.int32.as_datatype_enum), 2.0, 3.0, 3.0]),
            },
            {
                'wall_time': 1338,
                'step': 8,
                'device_name': '/job:localhost/replica:0/task:0/cpu:0',
                'node_name': 'logits/Add',
                'output_slot': 0,
                'dtype': 'tf.int16',
                'shape': [],
                'value': (list(range(12)) +
                          [float(tf.int16.as_datatype_enum), 0.0]),
            },
        ],
    }, self._DeserializeResponse(response.get_data()))

  def testRequestHealthPillsForEmptyRun(self):
    """Tests that the plugin responds with an empty dictionary."""
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps(['layers/Variable']),
            'run': 'run_with_no_health_pills',
        })
    self.assertEqual(200, response.status_code)
    self.assertDictEqual({}, self._DeserializeResponse(response.get_data()))

  def testGetRequestsUnsupported(self):
    """Tests that GET requests are unsupported."""
    response = self.server.get('/data/plugin/debugger/health_pills')
    self.assertEqual(405, response.status_code)

  def testRequestsWithoutProperPostKeyUnsupported(self):
    """Tests that requests lacking the node_names POST key are unsupported."""
    response = self.server.post('/data/plugin/debugger/health_pills')
    self.assertEqual(400, response.status_code)

  def testRequestsWithBadJsonUnsupported(self):
    """Tests that requests with undecodable JSON are unsupported."""
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': 'some obviously non JSON text',
        })
    self.assertEqual(400, response.status_code)

  def testRequestsWithNonListPostDataUnsupported(self):
    """Tests that requests with loads lacking lists of ops are unsupported."""
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps({
                'this is a dict': 'and not a list.'
            }),
        })
    self.assertEqual(400, response.status_code)

  def testFetchHealthPillsForSpecificStep(self):
    """Tests that requesting health pills at a specific steps works.

    This path may be slow in real life because it reads from disk.
    """
    # Request health pills for these nodes at step 7 specifically.
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps(['logits/Add', 'layers/Matmul']),
            'step': 7
        })
    self.assertEqual(200, response.status_code)
    # The response should only include health pills at step 7.
    self.assertDictEqual({
        'logits/Add': [
            {
                'wall_time': 1337,
                'step': 7,
                'device_name': '/job:localhost/replica:0/task:0/cpu:0',
                'node_name': 'logits/Add',
                'output_slot': 0,
                'dtype': 'tf.int32',
                'shape': [3.0, 3.0],
                'value': (list(range(12)) +
                          [float(tf.int32.as_datatype_enum), 2.0, 3.0, 3.0]),
            },
        ],
        'layers/Matmul': [
            {
                'wall_time': 43,
                'step': 7,
                'device_name': '/job:localhost/replica:0/task:0/cpu:0',
                'node_name': 'layers/Matmul',
                'output_slot': 1,
                'dtype': 'tf.float64',
                'shape': [3.0, 3.0],
                'value': (list(range(12)) +
                          [float(tf.float64.as_datatype_enum), 2.0, 3.0, 3.0]),
            },
        ],
    }, self._DeserializeResponse(response.get_data()))

  def testNoHealthPillsForSpecificStep(self):
    """Tests that an empty mapping is returned for no health pills at a step."""
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps(['some/clearly/non-existent/op']),
            'step': 7
        })
    self.assertEqual(200, response.status_code)
    self.assertDictEqual({}, self._DeserializeResponse(response.get_data()))

  def testNoHealthPillsForOutOfRangeStep(self):
    """Tests that an empty mapping is returned for an out of range step."""
    response = self.server.post(
        '/data/plugin/debugger/health_pills',
        data={
            'node_names': json.dumps(['logits/Add', 'layers/Matmul']),
            # This step higher than that of any event written to disk.
            'step': 42424242
        })
    self.assertEqual(200, response.status_code)
    self.assertDictEqual({}, self._DeserializeResponse(response.get_data()))

  def testNumericsAlertReportResponse(self):
    """Tests that reports of bad values are returned."""
    alerts = [
        numerics_alert.NumericsAlertReportRow('cpu0', 'MatMul', 123, 2, 3, 4),
        numerics_alert.NumericsAlertReportRow('cpu1', 'Add', 124, 5, 6, 7),
    ]
    self.mock_debugger_data_server.numerics_alert_report.return_value = alerts
    response = self.server.get('/data/plugin/debugger/numerics_alert_report')
    self.assertEqual(200, response.status_code)

    retrieved_alerts = self._DeserializeResponse(response.get_data())
    self.assertEqual(2, len(retrieved_alerts))
    self.assertDictEqual({
        'device_name': 'cpu0',
        'tensor_name': 'MatMul',
        'first_timestamp': 123,
        'nan_event_count': 2,
        'neg_inf_event_count': 3,
        'pos_inf_event_count': 4,
    }, retrieved_alerts[0])
    self.assertDictEqual({
        'device_name': 'cpu1',
        'tensor_name': 'Add',
        'first_timestamp': 124,
        'nan_event_count': 5,
        'neg_inf_event_count': 6,
        'pos_inf_event_count': 7,
    }, retrieved_alerts[1])

  def testDebuggerDataServerNotStartedWhenPortIsNone(self):
    """Tests that the plugin starts no debugger data server if port is None."""
    self.mock_debugger_data_server_class.reset_mock()

    # Initialize a debugger plugin with no GRPC port provided.
    self.debugger_plugin_module.DebuggerPlugin(self.context).get_plugin_apps()

    # No debugger data server should have been started.
    # assert_not_called is not available in Python 3.4.
    self.assertFalse(self.mock_debugger_data_server_class.called)


if __name__ == '__main__':
  tf.test.main()
