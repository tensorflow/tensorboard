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
"""Tests end-to-end debugger interactive data server behavior.

This test launches an instance InteractiveDebuggerPlugin as a separate thread.
The test then calls Session.run() using RunOptions pointing to the grpc:// debug
URL of the debugger data server. It then sends HTTP requests to the TensorBoard
backend endpoints to query and control the state of the Sessoin.run().
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json
import shutil
import tempfile
import threading

import numpy as np
import portpicker  # pylint: disable=import-error
from six.moves import urllib  # pylint: disable=wrong-import-order
import tensorflow as tf  # pylint: disable=wrong-import-order
from tensorflow.python import debug as tf_debug  # pylint: disable=wrong-import-order
from werkzeug import test as werkzeug_test  # pylint: disable=wrong-import-order
from werkzeug import wrappers  # pylint: disable=wrong-import-order

from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger import interactive_debugger_plugin

_SERVER_URL_PREFIX = '/data/plugin/debugger/'


class InteractiveDebuggerPluginTest(tf.test.TestCase):

  def setUp(self):
    super(InteractiveDebuggerPluginTest, self).setUp()

    self._dummy_logdir = tempfile.mkdtemp()
    self._dummy_multiplexer = event_multiplexer.EventMultiplexer({})
    self._debugger_port = portpicker.pick_unused_port()
    self._debugger_url = 'grpc://localhost:%d' % self._debugger_port
    context = base_plugin.TBContext(logdir=self._dummy_logdir,
                                    multiplexer=self._dummy_multiplexer)
    self._debugger_plugin = (
        interactive_debugger_plugin.InteractiveDebuggerPlugin(context))
    self._debugger_plugin.listen(self._debugger_port)

    wsgi_app = application.TensorBoardWSGIApp(
        self._dummy_logdir,
        [self._debugger_plugin],
        self._dummy_multiplexer,
        reload_interval=0,
        path_prefix='')
    self._server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)

  def tearDown(self):
    # In some cases (e.g., an empty test method body), the stop_server() method
    # may get called before the server is started, leading to a ValueError.
    while True:
      try:
        self._debugger_plugin._debugger_data_server.stop_server()
        break
      except ValueError:
        pass
    shutil.rmtree(self._dummy_logdir, ignore_errors=True)
    super(InteractiveDebuggerPluginTest, self).tearDown()

  def _serverGet(self, path, params=None, expected_status_code=200):
    """Send the serve a GET request and obtain the response.

    Args:
      path: URL path (excluding the prefix), without parameters encoded.
      params: Query parameters to be encoded in the URL, as a dict.
      expected_status_code: Expected status code.

    Returns:
      Response from server.
    """
    url = _SERVER_URL_PREFIX + path
    if params:
      url += '?' + urllib.parse.urlencode(params)
    response = self._server.get(url)
    self.assertEqual(expected_status_code, response.status_code)
    return response

  def _deserializeResponse(self, response):
    """Deserializes byte content that is a JSON encoding.

    Args:
      response: A response object.

    Returns:
      The deserialized python object decoded from JSON.
    """
    return json.loads(response.get_data().decode("utf-8"))

  def _runSimpleAddMultiplyGraph(self, variable_size=1):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        a = tf.Variable([10.0] * variable_size, name='a')
        b = tf.Variable([20.0] * variable_size, name='b')
        c = tf.Variable([30.0] * variable_size, name='c')
        x = tf.multiply(a, b, name="x")
        y = tf.add(x, c, name="y")

        sess.run(tf.global_variables_initializer())

        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        session_run_results.append(sess.run(y))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def _runMultiStepAssignAddGraph(self, steps):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        a = tf.Variable(10, dtype=tf.int32, name='a')
        b = tf.Variable(1, dtype=tf.int32, name='b')
        inc_a = tf.assign_add(a, b, name='inc_a')

        sess.run(tf.global_variables_initializer())

        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        for _ in range(steps):
          session_run_results.append(sess.run(inc_a))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def _runTfGroupGraph(self):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        a = tf.Variable(10, dtype=tf.int32, name='a')
        b = tf.Variable(20, dtype=tf.int32, name='b')
        d = tf.constant(1, dtype=tf.int32, name='d')
        inc_a = tf.assign_add(a, d, name='inc_a')
        inc_b = tf.assign_add(b, d, name='inc_b')
        inc_ab = tf.group([inc_a, inc_b], name="inc_ab")

        sess.run(tf.global_variables_initializer())

        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        session_run_results.append(sess.run(inc_ab))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def testCommAndAckWithoutBreakpoints(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    comm_response = self._serverGet('comm', {'pos': 1})
    response_data = self._deserializeResponse(comm_response)
    self.assertGreater(response_data['timestamp'], 0)
    self.assertEqual('meta', response_data['type'])
    self.assertEqual({'run_key': ['', 'y:0', '']}, response_data['data'])

    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testGetDeviceNamesAndDebuggerGraph(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    comm_response = self._serverGet('comm', {'pos': 1})
    response_data = self._deserializeResponse(comm_response)
    run_key = json.dumps(response_data['data']['run_key'])

    device_names_response = self._serverGet(
        'gated_grpc', {'mode': 'retrieve_device_names', 'run_key': run_key})
    device_names_data = self._deserializeResponse(device_names_response)
    self.assertEqual(1, len(device_names_data['device_names']))
    device_name = device_names_data['device_names'][0]

    graph_response = self._serverGet(
        'debugger_graph', {'run_key': run_key, 'device_name': device_name})
    self.assertTrue(graph_response.get_data())

    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testRetrieveAllGatedGrpcTensors(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    comm_response = self._serverGet('comm', {'pos': 1})
    response_data = self._deserializeResponse(comm_response)
    run_key = json.dumps(response_data['data']['run_key'])

    retrieve_all_response = self._serverGet(
        'gated_grpc', {'mode': 'retrieve_all', 'run_key': run_key})
    retrieve_all_data = self._deserializeResponse(retrieve_all_response)
    self.assertTrue(retrieve_all_data['device_names'])
    # No breakpoints have been activated.
    self.assertEqual([], retrieve_all_data['breakpoints'])
    device_name = retrieve_all_data['device_names'][0]
    tensor_names = [item[0] for item
                    in retrieve_all_data['gated_grpc_tensors'][device_name]]
    self.assertItemsEqual(
        ['a', 'a/read', 'b', 'b/read', 'x', 'c', 'c/read', 'y'], tensor_names)

    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testActivateOneBreakpoint(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    comm_response = self._serverGet('comm', {'pos': 1})

    # Activate breakpoint for x:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Proceed to breakpoint x:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('float32', comm_data['data']['dtype'])
    self.assertEqual([1], comm_data['data']['shape'])
    self.assertEqual('x', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    self.assertAllClose([200.0], comm_data['data']['values'])

    # Proceed to the end of the Session.run().
    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

    # Verify that the activated breakpoint is remembered.
    breakpoints_response = self._serverGet(
        'gated_grpc', {'mode': 'breakpoints'})
    breakpoints_data = self._deserializeResponse(breakpoints_response)
    self.assertEqual([['x', 0, 'DebugIdentity']], breakpoints_data)

  def testActivateAndDeactivateOneBreakpoint(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    self._serverGet('comm', {'pos': 1})

    # Activate breakpoint for x:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Deactivate the breakpoint right away.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'disable'})

    # Proceed to the end of the Session.run().
    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

    # Verify that there is no breakpoint activated.
    breakpoints_response = self._serverGet(
        'gated_grpc', {'mode': 'breakpoints'})
    breakpoints_data = self._deserializeResponse(breakpoints_response)
    self.assertEqual([], breakpoints_data)

  def testActivateTwoBreakpoints(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    comm_response = self._serverGet('comm', {'pos': 1})

    # Activate breakpoint for x:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    # Activate breakpoint for y:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'y', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Proceed to breakpoint x:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('float32', comm_data['data']['dtype'])
    self.assertEqual([1], comm_data['data']['shape'])
    self.assertEqual('x', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    self.assertAllClose([200.0], comm_data['data']['values'])

    # Proceed to breakpoint y:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 3})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('float32', comm_data['data']['dtype'])
    self.assertEqual([1], comm_data['data']['shape'])
    self.assertEqual('y', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    self.assertAllClose([230.0], comm_data['data']['values'])

    # Proceed to the end of the Session.run().
    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

    # Verify that the activated breakpoints are remembered.
    breakpoints_response = self._serverGet(
        'gated_grpc', {'mode': 'breakpoints'})
    breakpoints_data = self._deserializeResponse(breakpoints_response)
    self.assertItemsEqual(
        [['x', 0, 'DebugIdentity'], ['y', 0, 'DebugIdentity']],
        breakpoints_data)

  def testCommResponseOmitsLargeSizedTensorValues(self):
    session_run_thread, session_run_results = (
        self._runSimpleAddMultiplyGraph(10))

    comm_response = self._serverGet('comm', {'pos': 1})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('meta', comm_data['type'])
    self.assertEqual({'run_key': ['', 'y:0', '']}, comm_data['data'])

    # Activate breakpoint for inc_a:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Continue to the breakpiont at x:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('float32', comm_data['data']['dtype'])
    self.assertEqual([10], comm_data['data']['shape'])
    self.assertEqual('x', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    # Verify that the large-sized tensor gets omitted in the comm response.
    self.assertEqual(None, comm_data['data']['values'])

    # Use the /tensor_data endpoint to obtain the full value of x:0.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'x:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual(None, tensor_data['error'])
    self.assertAllClose([[200.0] * 10], tensor_data['tensor_data'])

    # Use the /tensor_data endpoint to obtain the sliced value of x:0.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'x:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': '',
         'slicing': '[:5]'})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual(None, tensor_data['error'])
    self.assertAllClose([[200.0] * 5], tensor_data['tensor_data'])

    # Continue to the end.
    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0] * 10], session_run_results)

  def testMultipleSessionRunsTensorValueFullHistory(self):
    session_run_thread, session_run_results = (
        self._runMultiStepAssignAddGraph(2))

    comm_response = self._serverGet('comm', {'pos': 1})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('meta', comm_data['type'])
    self.assertEqual({'run_key': ['', 'inc_a:0', '']}, comm_data['data'])

    # Activate breakpoint for inc_a:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'inc_a', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Continue to inc_a:0 for the 1st time.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('int32', comm_data['data']['dtype'])
    self.assertEqual([], comm_data['data']['shape'])
    self.assertEqual('inc_a', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    self.assertAllClose(11.0, comm_data['data']['values'])

    # Call /tensor_data to get the full history of the inc_a tensor (so far).
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'inc_a:0:DebugIdentity',
         'time_indices': ':',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual({'tensor_data': [11], 'error': None}, tensor_data)

    # Continue to the beginning of the 2nd session.run.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 3})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('meta', comm_data['type'])
    self.assertEqual({'run_key': ['', 'inc_a:0', '']}, comm_data['data'])

    # Continue to inc_a:0 for the 2nd time.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 4})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('int32', comm_data['data']['dtype'])
    self.assertEqual([], comm_data['data']['shape'])
    self.assertEqual('inc_a', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    self.assertAllClose(12.0, comm_data['data']['values'])

    # Call /tensor_data to get the full history of the inc_a tensor.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'inc_a:0:DebugIdentity',
         'time_indices': ':',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual({'tensor_data': [11, 12], 'error': None}, tensor_data)

    # Call /tensor_data to get the latst time index of the inc_a tensor.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'inc_a:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual({'tensor_data': [12], 'error': None}, tensor_data)

    # Continue to the end.
    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([11.0, 12.0], session_run_results)

  def testSetBreakpointOnNoTensorOp(self):
    session_run_thread, session_run_results = self._runTfGroupGraph()

    comm_response = self._serverGet('comm', {'pos': 1})
    comm_data = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data['timestamp'], 0)
    self.assertEqual('meta', comm_data['type'])
    self.assertEqual({'run_key': ['', '', 'inc_ab']}, comm_data['data'])

    # Activate breakpoint for inc_a:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'inc_a', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Activate breakpoint for inc_ab.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'inc_ab', 'output_slot': -1,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Continue to inc_a:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('int32', comm_data['data']['dtype'])
    self.assertEqual([], comm_data['data']['shape'])
    self.assertEqual('inc_a', comm_data['data']['node_name'])
    self.assertEqual(0, comm_data['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data['data']['debug_op'])
    self.assertAllClose(11.0, comm_data['data']['values'])

    # Continue to the end. The breakpoint at inc_ab should not have blocked
    # the execution, due to the fact that inc_ab is a tf.group op that produces
    # no output.
    self._serverGet('ack')
    session_run_thread.join()
    self.assertEqual([None], session_run_results)

    breakpoints_response = self._serverGet(
        'gated_grpc', {'mode': 'breakpoints'})
    breakpoints_data = self._deserializeResponse(breakpoints_response)
    self.assertItemsEqual(
        [['inc_a', 0, 'DebugIdentity'], ['inc_ab', -1, 'DebugIdentity']],
        breakpoints_data)

  def testCommDataCanBeServedToMultipleClients(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()

    comm_response = self._serverGet('comm', {'pos': 1})
    comm_data_1 = self._deserializeResponse(comm_response)

    # Activate breakpoint for x:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    # Activate breakpoint for y:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'y', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})

    # Proceed to breakpoint x:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data_2 = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data_2['timestamp'], 0)
    self.assertEqual('tensor', comm_data_2['type'])
    self.assertEqual('float32', comm_data_2['data']['dtype'])
    self.assertEqual([1], comm_data_2['data']['shape'])
    self.assertEqual('x', comm_data_2['data']['node_name'])
    self.assertEqual(0, comm_data_2['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data_2['data']['debug_op'])
    self.assertAllClose([200.0], comm_data_2['data']['values'])

    # Proceed to breakpoint y:0.
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 3})
    comm_data_3 = self._deserializeResponse(comm_response)
    self.assertGreater(comm_data_3['timestamp'], 0)
    self.assertEqual('tensor', comm_data_3['type'])
    self.assertEqual('float32', comm_data_3['data']['dtype'])
    self.assertEqual([1], comm_data_3['data']['shape'])
    self.assertEqual('y', comm_data_3['data']['node_name'])
    self.assertEqual(0, comm_data_3['data']['output_slot'])
    self.assertEqual('DebugIdentity', comm_data_3['data']['debug_op'])
    self.assertAllClose([230.0], comm_data_3['data']['values'])

    # Proceed to the end of the Session.run().
    self._serverGet('ack')

    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

    # A 2nd client requests for comm data at positions 1, 2 and 3 again.
    comm_response = self._serverGet('comm', {'pos': 1})
    self.assertEqual(comm_data_1, self._deserializeResponse(comm_response))
    comm_response = self._serverGet('comm', {'pos': 2})
    self.assertEqual(comm_data_2, self._deserializeResponse(comm_response))
    comm_response = self._serverGet('comm', {'pos': 3})
    self.assertEqual(comm_data_3, self._deserializeResponse(comm_response))

  def testInvalidBreakpointStateLeadsTo400Response(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()
    self._serverGet('comm', {'pos': 1})

    # Use an invalid state ('bad_state') when setting a breakpoint state.
    response = self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'bad_state'},
        expected_status_code=400)
    data = self._deserializeResponse(response)
    self.assertEqual('Unrecognized new state for x:0:DebugIdentity: bad_state',
                     data['error'])

    self._serverGet('ack')
    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testInvalidModeArgForGatedGrpcRouteLeadsTo400Response(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()
    self._serverGet('comm', {'pos': 1})

    # Use an invalid mode argument ('bad_mode') when calling the 'gated_grpc'
    # endpoint.
    response = self._serverGet(
        'gated_grpc',
        {'mode': 'bad_mode', 'node_name': 'x', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'},
        expected_status_code=400)
    data = self._deserializeResponse(response)
    self.assertEqual('Unrecognized mode for the gated_grpc route: bad_mode',
                     data['error'])

    self._serverGet('ack')
    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testDebuggerHostAndGrpcPortEndpoint(self):
    response = self._serverGet('debugger_grpc_host_port')
    response_data = self._deserializeResponse(response)
    self.assertTrue(response_data['host'])
    self.assertEqual(self._debugger_port, response_data['port'])

  def testGetSourceFilePaths(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()
    self._serverGet('comm', {'pos': 1})

    source_paths_response = self._serverGet('source_code', {'mode': 'paths'})
    response_data = self._deserializeResponse(source_paths_response)
    self.assertIn(__file__, response_data['paths'])

    self._serverGet('ack')
    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testGetSourceFileContentWithValidFilePath(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()
    self._serverGet('comm', {'pos': 1})

    file_content_response = self._serverGet(
        'source_code', {'mode': 'content', 'file_path': __file__})
    response_data = self._deserializeResponse(file_content_response)
    # Verify that the content of this file is included.
    self.assertTrue(response_data['content'][__file__])
    # Verify that for the lines of the file that create TensorFlow ops, the list
    # of op names and their stack heights are included.
    op_linenos = collections.defaultdict(set)
    for lineno in response_data['lineno_to_op_name_and_stack_pos']:
      self.assertGreater(int(lineno), 0)
      for op_name, stack_pos in response_data[
          'lineno_to_op_name_and_stack_pos'][lineno]:
        op_linenos[op_name].add(lineno)
        self.assertGreaterEqual(stack_pos, 0)
    self.assertTrue(op_linenos['a'])
    self.assertTrue(op_linenos['a/Assign'])
    self.assertTrue(op_linenos['a/initial_value'])
    self.assertTrue(op_linenos['a/read'])
    self.assertTrue(op_linenos['b'])
    self.assertTrue(op_linenos['b/Assign'])
    self.assertTrue(op_linenos['b/initial_value'])
    self.assertTrue(op_linenos['b/read'])
    self.assertTrue(op_linenos['c'])
    self.assertTrue(op_linenos['c/Assign'])
    self.assertTrue(op_linenos['c/initial_value'])
    self.assertTrue(op_linenos['c/read'])
    self.assertTrue(op_linenos['x'])
    self.assertTrue(op_linenos['y'])

    self._serverGet('ack')
    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def testGetSourceOpTraceback(self):
    session_run_thread, session_run_results = self._runSimpleAddMultiplyGraph()
    self._serverGet('comm', {'pos': 1})

    for op_name in ('a', 'b', 'c', 'x', 'y'):
      op_traceback_reponse = self._serverGet(
          'source_code', {'mode': 'op_traceback', 'op_name': op_name})
      response_data = self._deserializeResponse(op_traceback_reponse)
      found_current_file = False
      for file_path, lineno in response_data['op_traceback'][op_name]:
        self.assertGreater(lineno, 0)
        if file_path == __file__:
          found_current_file = True
          break
      self.assertTrue(found_current_file)

    self._serverGet('ack')
    session_run_thread.join()
    self.assertAllClose([[230.0]], session_run_results)

  def _runInitializer(self):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        a = tf.Variable([10.0] * 10, name='a')
        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        # Run the initializer with a debugger-wrapped tf.Session.
        session_run_results.append(sess.run(a.initializer))
        session_run_results.append(sess.run(a))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def testTensorDataForUnitializedTensorIsHandledCorrectly(self):
    session_run_thread, session_run_results = self._runInitializer()
    # Activate breakpoint for a:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'a', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    self._serverGet('ack')
    self._serverGet('ack')
    self._serverGet('ack')
    self._serverGet('ack')
    session_run_thread.join()
    self.assertEqual(2, len(session_run_results))
    self.assertIsNone(session_run_results[0])
    self.assertAllClose([10.0] * 10, session_run_results[1])

    # Get tensor data without slicing.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'a:0:DebugIdentity',
         'time_indices': ':',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertIsNone(tensor_data['error'])
    tensor_data = tensor_data['tensor_data']
    self.assertEqual(2, len(tensor_data))
    self.assertIsNone(tensor_data[0])
    self.assertAllClose([10.0] * 10, tensor_data[1])

    # Get tensor data with slicing.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'a:0:DebugIdentity',
         'time_indices': ':',
         'mapping': '',
         'slicing': '[:5]'})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertIsNone(tensor_data['error'])
    tensor_data = tensor_data['tensor_data']
    self.assertEqual(2, len(tensor_data))
    self.assertIsNone(tensor_data[0])
    self.assertAllClose([10.0] * 5, tensor_data[1])

  def testCommDataForUninitializedTensorIsHandledCorrectly(self):
    session_run_thread, _ = self._runInitializer()
    # Activate breakpoint for a:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'a', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('Uninitialized', comm_data['data']['dtype'])
    self.assertEqual('Uninitialized', comm_data['data']['shape'])
    self.assertEqual('N/A', comm_data['data']['values'])
    self.assertEqual(
        'a/(a)', comm_data['data']['maybe_base_expanded_node_name'])
    self._serverGet('ack')
    self._serverGet('ack')
    self._serverGet('ack')
    session_run_thread.join()

  def _runHealthPillNetwork(self):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        a = tf.Variable(
            [np.nan, np.inf, np.inf, -np.inf, -np.inf, -np.inf, 10, 20, 30],
            dtype=tf.float32, name='a')
        session_run_results.append(sess.run(a.initializer))
        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        session_run_results.append(sess.run(a))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def testHealthPill(self):
    session_run_thread, _ = self._runHealthPillNetwork()
    # Activate breakpoint for a:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'a', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    self._serverGet('ack')
    self._serverGet('ack')
    session_run_thread.join()
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'a:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': 'health-pill',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertIsNone(tensor_data['error'])
    tensor_data = tensor_data['tensor_data'][0]
    self.assertAllClose(1.0, tensor_data[0])  # IsInitialized.
    self.assertAllClose(9.0, tensor_data[1])  # Total count.
    self.assertAllClose(1.0, tensor_data[2])  # NaN count.
    self.assertAllClose(3.0, tensor_data[3])  # -Infinity count.
    self.assertAllClose(0.0, tensor_data[4])  # Finite negative count.
    self.assertAllClose(0.0, tensor_data[5])  # Zero count.
    self.assertAllClose(3.0, tensor_data[6])  # Positive count.
    self.assertAllClose(2.0, tensor_data[7])  # +Infinity count.
    self.assertAllClose(10.0, tensor_data[8])  # Min.
    self.assertAllClose(30.0, tensor_data[9])  # Max.
    self.assertAllClose(20.0, tensor_data[10])  # Mean.
    self.assertAllClose(
        np.var([10.0, 20.0, 30.0]), tensor_data[11])  # Variance.

  def _runAsciiStringNetwork(self):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        str1 = tf.Variable('abc', name='str1')
        str2 = tf.Variable('def', name='str2')
        str_concat = tf.add(str1, str2, name='str_concat')
        sess.run(tf.global_variables_initializer())
        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        session_run_results.append(sess.run(str_concat))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def testAsciiStringTensorIsHandledCorrectly(self):
    session_run_thread, session_run_results = self._runAsciiStringNetwork()
    # Activate breakpoint for str1:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'str1', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    self._serverGet('ack')
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('string', comm_data['data']['dtype'])
    self.assertEqual([], comm_data['data']['shape'])
    self.assertEqual('abc', comm_data['data']['values'])
    self.assertEqual(
        'str1/(str1)', comm_data['data']['maybe_base_expanded_node_name'])
    session_run_thread.join()
    self.assertEqual(1, len(session_run_results))
    self.assertEqual(b"abcdef", session_run_results[0])

    # Get the value of a tensor without mapping.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'str1:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual(None, tensor_data['error'])
    self.assertEqual(['abc'], tensor_data['tensor_data'])

    # Get the health pill of a string tensor.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'str1:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': 'health-pill',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual(None, tensor_data['error'])
    self.assertEqual([None], tensor_data['tensor_data'])

  def _runBinaryStringNetwork(self):
    session_run_results = []
    def session_run_job():
      with tf.Session() as sess:
        str1 = tf.Variable([b'\x01' * 3, b'\x02' * 3], name='str1')
        str2 = tf.Variable([b'\x03' * 3, b'\x04' * 3], name='str2')
        str_concat = tf.add(str1, str2, name='str_concat')
        sess.run(tf.global_variables_initializer())
        sess = tf_debug.TensorBoardDebugWrapperSession(sess, self._debugger_url)
        session_run_results.append(sess.run(str_concat))
    session_run_thread = threading.Thread(target=session_run_job)
    session_run_thread.start()
    return session_run_thread, session_run_results

  def testBinaryStringTensorIsHandledCorrectly(self):
    session_run_thread, session_run_results = self._runBinaryStringNetwork()
    # Activate breakpoint for str1:0.
    self._serverGet(
        'gated_grpc',
        {'mode': 'set_state', 'node_name': 'str1', 'output_slot': 0,
         'debug_op': 'DebugIdentity', 'state': 'break'})
    self._serverGet('ack')
    self._serverGet('ack')
    comm_response = self._serverGet('comm', {'pos': 2})
    comm_data = self._deserializeResponse(comm_response)
    self.assertEqual('tensor', comm_data['type'])
    self.assertEqual('string', comm_data['data']['dtype'])
    self.assertEqual([2], comm_data['data']['shape'])
    self.assertEqual(2, len(comm_data['data']['values']))
    self.assertEqual(
        b'=01' * 3, tf.compat.as_bytes(comm_data['data']['values'][0]))
    self.assertEqual(
        b'=02' * 3, tf.compat.as_bytes(comm_data['data']['values'][1]))
    self.assertEqual(
        'str1/(str1)', comm_data['data']['maybe_base_expanded_node_name'])
    session_run_thread.join()
    self.assertEqual(1, len(session_run_results))
    self.assertAllEqual(
        np.array([b'\x01\x01\x01\x03\x03\x03', b'\x02\x02\x02\x04\x04\x04'],
                 dtype=np.object),
        session_run_results[0])

    # Get the value of a tensor without mapping.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'str1:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': '',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual(None, tensor_data['error'])
    self.assertEqual(2, len(tensor_data['tensor_data'][0]))
    self.assertEqual(
        b'=01=01=01', tf.compat.as_bytes(tensor_data['tensor_data'][0][0]))
    self.assertEqual(
        b'=02=02=02', tf.compat.as_bytes(tensor_data['tensor_data'][0][1]))

    # Get the health pill of a string tensor.
    tensor_response = self._serverGet(
        'tensor_data',
        {'watch_key': 'str1:0:DebugIdentity',
         'time_indices': '-1',
         'mapping': 'health-pill',
         'slicing': ''})
    tensor_data = self._deserializeResponse(tensor_response)
    self.assertEqual(None, tensor_data['error'])
    self.assertEqual([None], tensor_data['tensor_data'])


if __name__ == "__main__":
  tf.test.main()
