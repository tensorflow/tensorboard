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

import json
import shutil
import tempfile
import threading

import portpicker  # pylint: disable=import-error
from six.moves import urllib
import tensorflow as tf
from tensorflow.python import debug as tf_debug

from werkzeug import test as werkzeug_test
from werkzeug import wrappers

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

        run_options = tf.RunOptions()
        tf_debug.watch_graph(run_options,
                             sess.graph,
                             debug_ops="DebugIdentity(gated_grpc=True)",
                             debug_urls=self._debugger_url)
        session_run_results.append(sess.run(y, options=run_options))
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

        run_options = tf.RunOptions()
        tf_debug.watch_graph(run_options,
                             sess.graph,
                             debug_ops="DebugIdentity(gated_grpc=True)",
                             debug_urls=self._debugger_url)

        for _ in range(steps):
          session_run_results.append(sess.run(inc_a, options=run_options))
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
        run_options = tf.RunOptions()
        tf_debug.watch_graph(run_options,
                             sess.graph,
                             debug_ops="DebugIdentity(gated_grpc=True)",
                             debug_urls=self._debugger_url)
        session_run_results.append(sess.run(inc_ab, options=run_options))
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


if __name__ == "__main__":
  tf.test.main()
