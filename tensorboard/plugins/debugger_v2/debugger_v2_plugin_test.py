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
"""Tests for Debugger V2 Plugin."""


import collections
import json
import os
import socket
import threading

import tensorflow as tf
from werkzeug import test as werkzeug_test  # pylint: disable=wrong-import-order
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger_v2 import debug_data_multiplexer
from tensorboard.plugins.debugger_v2 import debugger_v2_plugin

mock = tf.compat.v1.test.mock

_HOST_NAME = socket.gethostname()
_CURRENT_FILE_FULL_PATH = os.path.abspath(__file__)


def _generate_tfdbg_v2_data(
    logdir, tensor_debug_mode="NO_TENSOR", logarithm_times=None
):
    """Generate a simple dump of tfdbg v2 data by running a TF2 program.

    The run is instrumented by the enable_dump_debug_info() API.

    The instrumented program is intentionally diverse in:
      - Execution paradigm: eager + tf.function
      - Control flow (TF while loop)
      - dtype and shape
    in order to faciliate testing.

    Args:
      logdir: Logdir to write the debugger data to.
      tensor_debug_mode: Mode for dumping debug tensor values, as an optional
        string. See the documentation of
        `tf.debugging.experimental.enable_dump_debug_info()` for details.
      logarithm_times: Optionally take logarithm of the final `x` file _ times
        iteratively, in order to produce nans.
    """
    x = tf.constant([1, 3, 3, 7], dtype=tf.float32)
    writer = tf.debugging.experimental.enable_dump_debug_info(
        logdir, circular_buffer_size=-1, tensor_debug_mode=tensor_debug_mode
    )
    try:

        @tf.function
        def unstack_and_sum(x):
            elements = tf.unstack(x)
            return elements[0] + elements[1] + elements[2] + elements[3]

        @tf.function
        def repeated_add(x, times):
            sum = tf.constant(0, dtype=x.dtype)
            i = tf.constant(0, dtype=tf.int32)
            while tf.less(i, times):
                sum += x
                i += 1
            return sum

        @tf.function
        def my_function(x):
            times = tf.constant(3, dtype=tf.int32)
            return repeated_add(unstack_and_sum(x), times)

        for i in range(3):
            assert my_function(x).numpy() == 42.0

        logarithm_times = 0 if logarithm_times is None else logarithm_times
        for i in range(logarithm_times):
            x = tf.math.log(x)
        # Expected iteration results:
        #   [0.        1.0986123 1.0986123 1.9459102]
        #   [-inf 0.09404784 0.09404784 0.6657298 ]
        #   [nan -2.3639517  -2.3639517  -0.40687138]
        #   [nan nan nan nan]
        #   [nan nan nan nan]
        #   [nan nan nan nan]
        #   ...

        writer.FlushNonExecutionFiles()
        writer.FlushExecutionFiles()
    finally:
        tf.debugging.experimental.disable_dump_debug_info()


_ROUTE_PREFIX = "/data/plugin/debugger-v2"

_DEFAULT_DEVICE_SUFFIX = "GPU:0" if tf.test.is_gpu_available() else "CPU:0"


class DebuggerV2PluginTest(tf.test.TestCase):
    def setUp(self):
        super().setUp()
        self.logdir = self.get_temp_dir()
        context = base_plugin.TBContext(logdir=self.logdir)
        self.plugin = debugger_v2_plugin.DebuggerV2Plugin(context)
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(wsgi_app, wrappers.Response)

        # The multiplexer reads data asynchronously on a separate thread, so
        # as not to block the main thread of the TensorBoard backend. During
        # unit test, we disable the asynchronous behavior, so that we can
        # load the debugger data synchronously on the main thread and get
        # determinisic behavior in the tests.
        def run_repeatedly_in_background_mock(target, interval_sec):
            del interval_sec  # Unused in this mock.
            target()
            return None, None

        self.run_in_background_patch = tf.compat.v1.test.mock.patch.object(
            debug_data_multiplexer,
            "run_repeatedly_in_background",
            run_repeatedly_in_background_mock,
        )
        self.run_in_background_patch.start()

    def tearDown(self):
        self.run_in_background_patch.stop()
        super().tearDown()

    def _getExactlyOneRun(self):
        """Assert there is exactly one DebuggerV2 run and get its ID."""
        run_listing = json.loads(
            self.server.get(_ROUTE_PREFIX + "/runs").get_data()
        )
        self.assertLen(run_listing, 1)
        return list(run_listing.keys())[0]

    def testPluginIsNotActiveByDefault(self):
        self.assertFalse(self.plugin.is_active())

    def testPluginIsActiveWithDataExists(self):
        _generate_tfdbg_v2_data(self.logdir)
        self.assertFalse(self.plugin.is_active())  # never explicitly active

    def testConcurrentCallsToPluginIsActiveWhenNotActive(self):
        results = collections.deque()

        def query_is_active():
            results.append(self.plugin.is_active())

        threads = [threading.Thread(target=query_is_active) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(list(results), [False] * 4)

    def testServeRunsWithoutExistingRuns(self):
        response = self.server.get(_ROUTE_PREFIX + "/runs")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(json.loads(response.get_data()), dict())

    def testServeRunsWithExistingRuns(self):
        _generate_tfdbg_v2_data(self.logdir)
        response = self.server.get(_ROUTE_PREFIX + "/runs")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(list(data.keys()), ["__default_debugger_run__"])
        run = data["__default_debugger_run__"]
        self.assertIsInstance(run["start_time"], float)
        self.assertGreater(run["start_time"], 0)

    def testConcurrentServeRunsWithoutExistingRuns(self):
        responses = collections.deque()

        def get_runs():
            responses.append(self.server.get(_ROUTE_PREFIX + "/runs"))

        threads = [threading.Thread(target=get_runs) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertLen(responses, 4)
        for response in responses:
            self.assertEqual(200, response.status_code)
            self.assertEqual(
                "application/json", response.headers.get("content-type")
            )
            self.assertEqual(json.loads(response.get_data()), dict())

    def testConcurrentServeRunsWithExistingRuns(self):
        _generate_tfdbg_v2_data(self.logdir)
        responses = collections.deque()

        def get_runs():
            responses.append(self.server.get(_ROUTE_PREFIX + "/runs"))

        threads = [threading.Thread(target=get_runs) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertLen(responses, 4)
        for response in responses:
            self.assertEqual(200, response.status_code)
            self.assertEqual(
                "application/json", response.headers.get("content-type")
            )
            data = json.loads(response.get_data())
            self.assertEqual(list(data.keys()), ["__default_debugger_run__"])
            run = data["__default_debugger_run__"]
            self.assertIsInstance(run["start_time"], float)
            self.assertGreater(run["start_time"], 0)

    def testAlertsWhenNoAlertExists(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/alerts?run=%s&begin=0&end=0" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(
            data,
            {
                "begin": 0,
                "end": 0,
                "num_alerts": 0,
                "alerts_breakdown": {},
                "per_type_alert_limit": 1000,
                "alert_type": None,
                "alerts": [],
            },
        )

    def testGetAlertNumberOnlyWhenAlertExistsCurtHealthMode(self):
        _generate_tfdbg_v2_data(
            self.logdir, tensor_debug_mode="CURT_HEALTH", logarithm_times=4
        )
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/alerts?run=%s&begin=0&end=0" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(
            data,
            {
                "begin": 0,
                "end": 0,
                "num_alerts": 3,
                "alerts_breakdown": {
                    "InfNanAlert": 3,
                },
                "per_type_alert_limit": 1000,
                "alert_type": None,
                "alerts": [],
            },
        )

    def testGetAlertsContentWhenAlertExistsConciseHealthMode(self):
        _generate_tfdbg_v2_data(
            self.logdir, tensor_debug_mode="CONCISE_HEALTH", logarithm_times=4
        )
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/alerts?run=%s&begin=0&end=3" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 3)
        self.assertEqual(data["num_alerts"], 3)
        self.assertEqual(data["alerts_breakdown"], {"InfNanAlert": 3})
        self.assertEqual(data["per_type_alert_limit"], 1000)
        alerts = data["alerts"]
        self.assertLen(alerts, 3)
        self.assertEqual(
            alerts[0],
            {
                "alert_type": "InfNanAlert",
                "op_type": "Log",
                "output_slot": 0,
                "size": 4.0,
                "num_neg_inf": 1.0,
                "num_pos_inf": 0.0,
                "num_nan": 0.0,
                "execution_index": 4,
                "graph_execution_trace_index": None,
            },
        )
        self.assertEqual(
            alerts[1],
            {
                "alert_type": "InfNanAlert",
                "op_type": "Log",
                "output_slot": 0,
                "size": 4.0,
                "num_neg_inf": 0.0,
                "num_pos_inf": 0.0,
                "num_nan": 1.0,
                "execution_index": 5,
                "graph_execution_trace_index": None,
            },
        )
        self.assertEqual(
            alerts[2],
            {
                "alert_type": "InfNanAlert",
                "op_type": "Log",
                "output_slot": 0,
                "size": 4.0,
                "num_neg_inf": 0.0,
                "num_pos_inf": 0.0,
                "num_nan": 4.0,
                "execution_index": 6,
                "graph_execution_trace_index": None,
            },
        )

    def testGetAlertsWithInvalidBeginOrEndWhenAlertExistsCurtHealthMode(self):
        _generate_tfdbg_v2_data(
            self.logdir, tensor_debug_mode="CURT_HEALTH", logarithm_times=4
        )
        run = self._getExactlyOneRun()

        # begin = 0; end = 5
        response = self.server.get(
            _ROUTE_PREFIX + "/alerts?run=%s&begin=0&end=5" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (5) out of bounds (3)"},
        )

        # begin = -1; end = 2
        response = self.server.get(
            _ROUTE_PREFIX + "/alerts?run=%s&begin=-1&end=2" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: Invalid begin index (-1)"},
        )

        # begin = 2; end = 1
        response = self.server.get(
            _ROUTE_PREFIX + "/alerts?run=%s&begin=2&end=1" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "end index (1) is unexpectedly less than begin index (2)"
            },
        )

    def testGetAlertsWithAlertType(self):
        _generate_tfdbg_v2_data(
            self.logdir, tensor_debug_mode="CONCISE_HEALTH", logarithm_times=4
        )
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX
            + "/alerts?run=%s&alert_type=InfNanAlert&begin=1&end=-1" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 1)
        self.assertEqual(data["end"], 3)
        self.assertEqual(data["num_alerts"], 3)
        self.assertEqual(data["alerts_breakdown"], {"InfNanAlert": 3})
        self.assertEqual(data["alert_type"], "InfNanAlert")
        alerts = data["alerts"]
        self.assertLen(alerts, 2)
        self.assertEqual(
            alerts[0],
            {
                "alert_type": "InfNanAlert",
                "op_type": "Log",
                "output_slot": 0,
                "size": 4.0,
                "num_neg_inf": 0.0,
                "num_pos_inf": 0.0,
                "num_nan": 1.0,
                "execution_index": 5,
                "graph_execution_trace_index": None,
            },
        )
        self.assertEqual(
            alerts[1],
            {
                "alert_type": "InfNanAlert",
                "op_type": "Log",
                "output_slot": 0,
                "size": 4.0,
                "num_neg_inf": 0.0,
                "num_pos_inf": 0.0,
                "num_nan": 4.0,
                "execution_index": 6,
                "graph_execution_trace_index": None,
            },
        )

    def testGetAlertsWithTypeFilterAndInvalidBeginOrEndWhenAlertsExist(self):
        _generate_tfdbg_v2_data(
            self.logdir, tensor_debug_mode="CURT_HEALTH", logarithm_times=4
        )
        run = self._getExactlyOneRun()

        # begin = 0; end = 5
        response = self.server.get(
            _ROUTE_PREFIX
            + "/alerts?alert_type=InfNanAlert&run=%s&begin=0&end=5" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (5) out of bounds (3)"},
        )

        # begin = -1; end = 2
        response = self.server.get(
            _ROUTE_PREFIX
            + "/alerts?alert_type=InfNanAlert&run=%s&begin=-1&end=2" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: Invalid begin index (-1)"},
        )

        # begin = 2; end = 1
        response = self.server.get(
            _ROUTE_PREFIX
            + "/alerts?alert_type=InfNanAlert&run=%s&begin=2&end=1" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "end index (1) is unexpectedly less than begin index (2)"
            },
        )

    def testGetAlertsWithNonexistentTypeFilterWhenAlertsExist(self):
        _generate_tfdbg_v2_data(
            self.logdir, tensor_debug_mode="CURT_HEALTH", logarithm_times=4
        )
        run = self._getExactlyOneRun()

        response = self.server.get(
            _ROUTE_PREFIX
            + "/alerts?alert_type=NonexistentAlert&run=%s&begin=0&end=-1" % run
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "Filtering of alerts failed: alert type NonexistentAlert "
                "does not exist"
            },
        )

    def testServeExecutionDigestsWithEqualBeginAndEnd(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=0&end=0" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(
            data,
            {
                "begin": 0,
                "end": 0,
                "num_digests": 3,
                "execution_digests": [],
            },
        )

    def testServeExecutionDigestsWithEndGreaterThanBeginFullRange(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=0&end=3" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 3)
        self.assertEqual(data["num_digests"], 3)
        execution_digests = data["execution_digests"]
        self.assertLen(execution_digests, 3)
        prev_wall_time = 0
        for execution_digest in execution_digests:
            self.assertGreaterEqual(
                execution_digest["wall_time"], prev_wall_time
            )
            prev_wall_time = execution_digest["wall_time"]
            self.assertStartsWith(
                execution_digest["op_type"], "__inference_my_function"
            )

    def testServeExecutionDigestsWithImplicitFullRange(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=0" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 3)
        self.assertEqual(data["num_digests"], 3)
        execution_digests = data["execution_digests"]
        self.assertLen(execution_digests, 3)
        prev_wall_time = 0
        for execution_digest in execution_digests:
            self.assertGreaterEqual(
                execution_digest["wall_time"], prev_wall_time
            )
            prev_wall_time = execution_digest["wall_time"]
            self.assertStartsWith(
                execution_digest["op_type"], "__inference_my_function"
            )

    def testServeExecutionDigestsWithEndGreaterThanBeginPartialRange(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=0&end=2" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 2)
        self.assertEqual(data["num_digests"], 3)
        execution_digests = data["execution_digests"]
        self.assertLen(execution_digests, 2)
        prev_wall_time = 0
        for execution_digest in execution_digests:
            self.assertGreaterEqual(
                execution_digest["wall_time"], prev_wall_time
            )
            prev_wall_time = execution_digest["wall_time"]
            self.assertStartsWith(
                execution_digest["op_type"], "__inference_my_function"
            )

    def testServeExecutionDigestOutOfBoundsError(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()

        # begin = 0; end = 4
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=0&end=4" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (4) out of bounds (3)"},
        )

        # begin = -1; end = 2
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=-1&end=2" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: Invalid begin index (-1)"},
        )

        # begin = 2; end = 1
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/digests?run=%s&begin=2&end=1" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "end index (1) is unexpectedly less than begin index (2)"
            },
        )

    def testServeExecutionDigests400ResponseIfRunParamIsNotSpecified(self):
        response = self.server.get(
            # `run` parameter is not specified here.
            _ROUTE_PREFIX
            + "/execution/digests?begin=0&end=0"
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "run parameter is not provided"},
        )

    def testServeASingleExecutionDataObject(self):
        _generate_tfdbg_v2_data(self.logdir, tensor_debug_mode="CONCISE_HEALTH")
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/data?run=%s&begin=0&end=1" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 1)
        self.assertLen(data["executions"], 1)
        execution = data["executions"][0]
        self.assertStartsWith(execution["op_type"], "__inference_my_function_")
        self.assertLen(execution["output_tensor_device_ids"], 1)
        self.assertEqual(execution["host_name"], _HOST_NAME)
        self.assertTrue(execution["stack_frame_ids"])
        self.assertLen(execution["input_tensor_ids"], 1)
        self.assertLen(execution["output_tensor_ids"], 1)
        self.assertTrue(execution["graph_id"])
        # CONCISE_HEALTH mode:
        #   [[Unused tensor ID, #(elements), #(-inf), #(+inf), #(nan)]].
        self.assertEqual(execution["tensor_debug_mode"], 3)
        self.assertAllClose(
            execution["debug_tensor_values"], [[-1.0, 1.0, 0.0, 0.0, 0.0]]
        )

    def testServeMultipleExecutionDataObject(self):
        _generate_tfdbg_v2_data(self.logdir, tensor_debug_mode="CURT_HEALTH")
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/data?run=%s&begin=0&end=-1" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 3)
        self.assertLen(data["executions"], 3)
        for i in range(3):
            execution = data["executions"][i]
            self.assertStartsWith(
                execution["op_type"], "__inference_my_function_"
            )
            self.assertLen(execution["output_tensor_device_ids"], 1)
            self.assertEqual(execution["host_name"], _HOST_NAME)
            self.assertTrue(execution["stack_frame_ids"])
            self.assertLen(execution["input_tensor_ids"], 1)
            self.assertLen(execution["output_tensor_ids"], 1)
            self.assertTrue(execution["graph_id"])
            if i > 0:
                self.assertEqual(
                    execution["input_tensor_ids"],
                    data["executions"][i - 1]["input_tensor_ids"],
                )
                self.assertEqual(
                    execution["graph_id"], data["executions"][i - 1]["graph_id"]
                )
            # CURT_HEALTH mode:
            #   [[Unused tensor ID, #(inf_or_nan)]].
            self.assertEqual(execution["tensor_debug_mode"], 2)
            self.assertAllClose(execution["debug_tensor_values"], [[-1.0, 0.0]])

    def testServeExecutionDataObjectsOutOfBoundsError(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()

        # begin = 0; end = 4
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/data?run=%s&begin=0&end=4" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (4) out of bounds (3)"},
        )

        # begin = -1; end = 2
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/data?run=%s&begin=-1&end=2" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: Invalid begin index (-1)"},
        )

        # begin = 2; end = 1
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/data?run=%s&begin=2&end=1" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "end index (1) is unexpectedly less than begin index (2)"
            },
        )

    def testServeGraphExecutionDigestsPartialRange(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graph_execution/digests?run=%s&begin=0&end=4" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 4)
        self.assertEqual(data["num_digests"], 207)
        digests = data["graph_execution_digests"]
        self.assertLen(digests, 4)
        self.assertGreater(digests[0]["wall_time"], 0)
        self.assertEqual(digests[0]["op_type"], "Const")
        self.assertEqual(digests[0]["output_slot"], 0)
        self.assertTrue(digests[0]["op_name"])
        self.assertTrue(digests[0]["graph_id"])

        self.assertGreaterEqual(
            digests[1]["wall_time"], digests[0]["wall_time"]
        )
        self.assertEqual(digests[1]["op_type"], "Unpack")
        self.assertEqual(digests[1]["output_slot"], 0)
        self.assertTrue(digests[1]["op_name"])
        self.assertNotEqual(digests[1]["op_name"], digests[0]["op_name"])
        self.assertTrue(digests[1]["graph_id"])

        self.assertGreaterEqual(
            digests[2]["wall_time"], digests[1]["wall_time"]
        )
        self.assertEqual(digests[2]["op_type"], "Unpack")
        self.assertEqual(digests[2]["output_slot"], 1)
        self.assertTrue(digests[2]["op_name"])
        self.assertTrue(digests[2]["graph_id"])

        self.assertGreaterEqual(
            digests[3]["wall_time"], digests[2]["wall_time"]
        )
        # The unstack() function uses the Unpack op under the hood.
        self.assertEqual(digests[3]["op_type"], "Unpack")
        self.assertEqual(digests[3]["output_slot"], 2)
        self.assertTrue(digests[3]["op_name"])
        self.assertTrue(digests[3]["graph_id"])

    def testServeGraphExecutionDigestsImplicitFullRange(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 207)
        self.assertEqual(data["num_digests"], 207)
        digests = data["graph_execution_digests"]
        self.assertLen(digests, 207)
        self.assertGreater(digests[-1]["wall_time"], 0)
        # Due to the while loop in the tf.function, the last op executed
        # is a Less op.
        self.assertEqual(digests[-1]["op_type"], "Less")
        self.assertEqual(digests[-1]["output_slot"], 0)
        self.assertTrue(digests[-1]["op_name"])
        self.assertTrue(digests[-1]["graph_id"])

    def testServeGraphExecutionDigestOutOfBoundsError(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()

        # begin = 0; end = 300
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graph_execution/digests?run=%s&begin=0&end=300" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (300) out of bounds (207)"},
        )

        # begin = -1; end = 2
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graph_execution/digests?run=%s&begin=-1&end=2" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: Invalid begin index (-1)"},
        )

        # begin = 2; end = 1
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graph_execution/digests?run=%s&begin=2&end=1" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "end index (1) is unexpectedly less than begin index (2)"
            },
        )

    def testServeASingleGraphExecutionDataObject(self):
        _generate_tfdbg_v2_data(self.logdir, tensor_debug_mode="CONCISE_HEALTH")
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/data?run=%s&begin=0&end=1" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 1)
        self.assertLen(data["graph_executions"], 1)
        graph_exec = data["graph_executions"][0]
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 0)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        # [tensor_id, element_count, nan_count, neg_inf_count, pos_inf_count].
        self.assertEqual(
            graph_exec["debug_tensor_value"], [4.0, 1.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

    def testServeMultipleGraphExecutionDataObjects(self):
        _generate_tfdbg_v2_data(self.logdir, tensor_debug_mode="CONCISE_HEALTH")
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/data?run=%s&begin=0&end=3" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 3)
        self.assertLen(data["graph_executions"], 3)

        graph_exec = data["graph_executions"][0]
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 0)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        # [tensor_id, element_count, nan_count, neg_inf_count, pos_inf_count].
        self.assertEqual(
            graph_exec["debug_tensor_value"], [4.0, 1.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

        graph_exec = data["graph_executions"][1]
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 1)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        self.assertEqual(
            graph_exec["debug_tensor_value"], [5.0, 1.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

        graph_exec = data["graph_executions"][2]
        # The unstack() function uses the Unpack op under the hood.
        self.assertStartsWith(graph_exec["op_type"], "Unpack")
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 2)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        self.assertEqual(
            graph_exec["debug_tensor_value"], [6.0, 1.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

    def testServeGraphExecutionDataObjectsOutOfBoundsError(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()

        # _generate_tfdbg_v2_data() generates exactly 186 graph-execution
        # traces.
        # begin = 0; end = 220
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/data?run=%s&begin=0&end=220" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (220) out of bounds (207)"},
        )

        # begin = -1; end = 2
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/data?run=%s&begin=-1&end=2" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: Invalid begin index (-1)"},
        )

        # begin = 2; end = 1
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/data?run=%s&begin=2&end=1" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Invalid argument: "
                "end index (1) is unexpectedly less than begin index (2)"
            },
        )

    def testServeGraphInfo(self):
        """Get the op info of an op with both inputs and consumers."""
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, look up the graph_id of the 1st AddV2 op.
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        data = json.loads(response.get_data())
        digests = data["graph_execution_digests"]
        op_types = [digest["op_type"] for digest in digests]
        op_index = op_types.index("AddV2")
        graph_id = digests[op_index]["graph_id"]

        # Query the /graphs/graph_info route for the inner graph.
        # This is the graph that contains the AddV2 op. It corresponds
        # to the function "unstack_and_sum".
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/graph_info?run=%s&graph_id=%s" % (run, graph_id)
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())
        outer_graph_id = data["outer_graph_id"]
        self.assertEqual(data["graph_id"], graph_id)
        self.assertEqual(data["name"], "unstack_and_sum")
        self.assertTrue(outer_graph_id)
        self.assertIsInstance(outer_graph_id, str)
        # The graph of unstack_and_sum has no inner graphs.
        self.assertEqual(data["inner_graph_ids"], [])

        # Query the /graphs/graph_info route for the outer graph.
        # This corresponds to the function "my_function"
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/graph_info?run=%s&graph_id=%s" % (run, outer_graph_id)
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())
        outermost_graph_id = data["outer_graph_id"]
        self.assertEqual(data["graph_id"], outer_graph_id)
        self.assertEqual(data["name"], "my_function")
        self.assertTrue(outermost_graph_id)
        self.assertIsInstance(outermost_graph_id, str)
        # This outer graph contains another inner graph (repeat_add).
        self.assertLen(data["inner_graph_ids"], 2)
        self.assertIn(graph_id, data["inner_graph_ids"])

        # Query the /graphs/graph_info route for the outermost graph.
        # This is an unnamed outermost graph.
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/graph_info?run=%s&graph_id=%s"
            % (run, outermost_graph_id)
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())
        self.assertEqual(data["graph_id"], outermost_graph_id)
        self.assertIsNone(data["name"])
        self.assertIsNone(data["outer_graph_id"])
        self.assertEqual(data["inner_graph_ids"], [outer_graph_id])

    def testServeGraphInfoRaisesErrorForInvalidGraphId(self):
        """Get the op info of an op with both inputs and consumers."""
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/graph_info?run=%s&graph_id=%s"
            % (run, "nonsensical-graph-id")
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": 'Not found: There is no graph with ID "nonsensical-graph-id"'
            },
        )

    def testServeGraphOpInfoForOpWithInputsAndConsumers(self):
        """Get the op info of an op with both inputs and consumers."""
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, look up the graph_id and name of the 1st AddV2 op.
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        data = json.loads(response.get_data())
        digests = data["graph_execution_digests"]
        op_types = [digest["op_type"] for digest in digests]
        op_index = op_types.index("AddV2")
        graph_id = digests[op_index]["graph_id"]
        op_name = digests[op_index]["op_name"]
        # Actually query the /graphs/op_info route.
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/op_info?run=%s&graph_id=%s&op_name=%s"
            % (run, graph_id, op_name)
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())

        # Check op's self properties.
        self.assertEqual(data["op_type"], "AddV2")
        self.assertEqual(data["op_name"], digests[op_index]["op_name"])
        # TODO(cais): Assert on detailed device name when available.
        self.assertIn("device_name", data)
        # The op is inside a nested tf.function, so its graph stack must have a
        # height > 1.
        self.assertGreater(len(data["graph_ids"]), 1)
        # All graph_ids should be non-empty strings.
        self.assertTrue(all(data["graph_ids"]))
        # All graph_ids should be unique (graph recursion is not currently
        # allowed in TF.)
        self.assertLen(set(data["graph_ids"]), len(data["graph_ids"]))
        self.assertNotIn("graph_id", data)
        self.assertEqual(data["graph_ids"][-1], digests[op_index]["graph_id"])
        self.assertNotIn("input_names", data)
        self.assertEqual(data["num_outputs"], 1)
        self.assertLen(data["output_tensor_ids"], 1)
        self.assertIsInstance(data["output_tensor_ids"][0], int)
        self.assertEqual(data["host_name"], _HOST_NAME)
        self.assertTrue(data["stack_frame_ids"])

        # Check input op properties.
        inputs = data["inputs"]
        # The two input tensors to the AddV2 op are from the same Unpack
        # (unstack) op that provides 4 outputs.
        self.assertTrue(inputs[0]["op_name"])
        self.assertEqual(inputs[0]["output_slot"], 0)
        self.assertTrue(inputs[1]["op_name"])
        self.assertEqual(inputs[1]["output_slot"], 1)
        input0 = inputs[0]["data"]
        input1 = inputs[1]["data"]
        for inpt in (input0, input1):
            self.assertEqual(inpt["op_type"], "Unpack")
            self.assertNotIn("input_names", inpt)
            self.assertEqual(inpt["num_outputs"], 4)
            self.assertLen(inpt["output_tensor_ids"], 4)
            self.assertEqual(inpt["host_name"], _HOST_NAME)
            self.assertEqual(inpt["graph_ids"], data["graph_ids"])
            self.assertLen(inpt["inputs"], 1)
            self.assertTrue(inpt["inputs"][0]["op_name"])
            self.assertIsInstance(inpt["inputs"][0]["op_name"], str)
            self.assertEqual(inpt["inputs"][0]["output_slot"], 0)
            self.assertNotIn("data", inpt["inputs"][0]["op_name"])
            self.assertLen(inpt["consumers"], 4)
            self.assertLen(inpt["consumers"][0], 1)
            self.assertEqual(inpt["consumers"][0][0]["input_slot"], 0)
            self.assertNotIn("data", inpt["consumers"][0][0])
            self.assertLen(inpt["consumers"][1], 1)
            self.assertEqual(inpt["consumers"][1][0]["input_slot"], 1)
            self.assertNotIn("data", inpt["consumers"][1][0])
            self.assertLen(inpt["consumers"][2], 1)
            self.assertEqual(inpt["consumers"][2][0]["input_slot"], 1)
            self.assertNotIn("data", inpt["consumers"][2][0])
            self.assertLen(inpt["consumers"][3], 1)
            self.assertEqual(inpt["consumers"][3][0]["input_slot"], 1)
            self.assertNotIn("data", inpt["consumers"][3][0])

        # Check consuming op properties.
        self.assertLen(data["consumers"], 1)
        self.assertLen(data["consumers"][0], 1)
        # The AddV2 is consumed by another AddV2 op in the same graph.
        self.assertTrue(data["consumers"][0][0]["op_name"])
        self.assertIsInstance(data["consumers"][0][0]["op_name"], str)
        self.assertEqual(data["consumers"][0][0]["input_slot"], 0)
        consumer = data["consumers"][0][0]["data"]
        self.assertEqual(consumer["op_type"], "AddV2")
        self.assertTrue(consumer["op_name"])
        self.assertNotEqual(consumer["op_name"], data["op_name"])
        self.assertEqual(consumer["num_outputs"], 1)
        self.assertLen(consumer["output_tensor_ids"], 1)
        self.assertIsInstance(consumer["output_tensor_ids"][0], int)
        self.assertEqual(consumer["host_name"], _HOST_NAME)
        self.assertTrue(consumer["stack_frame_ids"])
        self.assertLen(consumer["inputs"], 2)
        self.assertEqual(consumer["inputs"][0]["op_name"], data["op_name"])
        self.assertEqual(consumer["inputs"][0]["output_slot"], 0)
        self.assertNotIn("data", consumer["inputs"][0])
        self.assertEqual(consumer["inputs"][1]["output_slot"], 2)
        self.assertNotIn("data", consumer["inputs"][1])
        self.assertLen(consumer["consumers"], 1)
        self.assertLen(consumer["consumers"][0], 1)
        self.assertTrue(consumer["consumers"][0][0]["op_name"])
        self.assertIsInstance(consumer["consumers"][0][0]["op_name"], str)
        self.assertEqual(consumer["consumers"][0][0]["input_slot"], 0)
        self.assertNotIn("data", consumer["consumers"][0][0])

    def testServeGraphOpInfoForOpWithNoConsumers(self):
        """Get the op info of an op with no consumers in the same graph."""
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, look up the graph_id and name of the Iendity op in the
        # unstack_and_sum() graph. The Identity op marks the return value of
        # the tf.function and hence has no consumer.
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        data = json.loads(response.get_data())
        digests = data["graph_execution_digests"]
        op_types = [digest["op_type"] for digest in digests]
        add_index_0 = op_types.index("AddV2")
        graph_id = digests[add_index_0]["graph_id"]
        # Actually query the /graphs/op_info route.
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/op_info?run=%s&graph_id=%s&op_name=%s"
            % (run, graph_id, "Identity")
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())

        # Check op's self properties.
        self.assertEqual(data["op_type"], "Identity")
        self.assertEqual(data["op_name"], "Identity")
        # TODO(cais): Assert on detailed device name when available.
        self.assertIn("device_name", data)
        # The op is inside a nested tf.function, so its graph stack must have a height > 1.
        self.assertGreater(len(data["graph_ids"]), 1)
        self.assertEqual(data["graph_ids"][-1], graph_id)
        self.assertNotIn("input_names", data)
        self.assertEqual(data["num_outputs"], 1)
        self.assertEqual(data["host_name"], _HOST_NAME)
        self.assertTrue(data["stack_frame_ids"])

        # Check input op properties.
        self.assertLen(data["inputs"], 1)
        self.assertTrue(data["inputs"][0]["op_name"])
        self.assertIsInstance(data["inputs"][0]["op_name"], str)
        self.assertEqual(data["inputs"][0]["output_slot"], 0)
        input0 = data["inputs"][0]["data"]
        self.assertEqual(input0["op_type"], "AddV2")

        # Check consumers: There should be no consumers for this Identity op.
        self.assertEqual(data["consumers"], [[]])

    def testServeGraphOpInfoForOpWithNoInputs(self):
        """Get the op info of an op with no inputs."""
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        data = json.loads(response.get_data())
        digests = data["graph_execution_digests"]
        op_types = [digest["op_type"] for digest in digests]
        graph_ids = [digest["graph_id"] for digest in digests]
        placeholder_op_index = op_types.index("Placeholder")
        op_name = digests[placeholder_op_index]["op_name"]
        graph_id = digests[placeholder_op_index]["graph_id"]
        # Actually query the /graphs/op_info route.
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/op_info?run=%s&graph_id=%s&op_name=%s"
            % (run, graph_id, op_name)
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())

        # Check op's self properties.
        self.assertEqual(data["op_type"], "Placeholder")
        self.assertTrue(data["op_name"])
        # TODO(cais): Assert on detailed device name when available.
        self.assertIn("device_name", data)
        # The op is inside a nested tf.function, so its graph stack must have a height > 1.
        self.assertNotIn("graph_id", data)
        self.assertGreater(len(data["graph_ids"]), 1)
        self.assertEqual(data["graph_ids"][-1], graph_id)
        self.assertNotIn("input_names", data)
        self.assertEqual(data["num_outputs"], 1)
        self.assertEqual(data["host_name"], _HOST_NAME)
        self.assertTrue(data["stack_frame_ids"])

        # Check input op properties: The Placeholder has no inputs.
        self.assertEqual(data["inputs"], [])

        # Check consumers.
        self.assertLen(data["consumers"], 1)
        self.assertEmpty(data["consumers"][0])

    def testServeGraphOpInfoWithInputsAndConsumerLookupFailures(self):
        """Get the op info of an op with both inputs and consumers."""
        from tensorflow.python.debug.lib import debug_events_reader

        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, look up the graph_id and name of the 1st AddV2 op.
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        data = json.loads(response.get_data())
        digests = data["graph_execution_digests"]
        op_types = [digest["op_type"] for digest in digests]
        op_index = op_types.index("AddV2")
        graph_id = digests[op_index]["graph_id"]
        add_v2_op_name = digests[op_index]["op_name"]

        graph = self.plugin._data_provider._multiplexer._reader.graph_by_id(
            graph_id
        )

        def fake_get_op_creation_digest(op_name):
            if op_name == add_v2_op_name:
                return debug_events_reader.GraphOpCreationDigest(
                    1234.0,  # wall_time
                    777,  # offset
                    graph_id,
                    "AddV2",  # op_type
                    add_v2_op_name,
                    [12],  # output_tensor_ids
                    "localhost",  # host_name
                    ["a1", "b2"],  # stack_frame_ids
                    input_names=["add_v2_input:0"],
                )
            else:
                raise KeyError()

        with mock.patch.object(
            graph, "get_op_creation_digest", fake_get_op_creation_digest
        ):
            # Actually query the /graphs/op_info route.
            response = self.server.get(
                _ROUTE_PREFIX
                + "/graphs/op_info?run=%s&graph_id=%s&op_name=%s"
                % (run, graph_id, add_v2_op_name)
            )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data())

        self.assertNotIn("input_names", data)
        self.assertEqual(
            data["inputs"],
            [
                {
                    "op_name": "add_v2_input",
                    "output_slot": 0,
                }
            ],
        )  # "data" is missing due to op lookup failure.
        # Check the consumer op data, which should also be None due to the
        # KeyError encountered during the retrieval of the data about the
        # consumer op.
        self.assertLen(data["consumers"], 1)
        self.assertLen(data["consumers"][0], 1)
        consumer_spec = data["consumers"][0][0]
        self.assertTrue(consumer_spec["op_name"])
        self.assertIsInstance(consumer_spec["op_name"], str)
        self.assertEqual(consumer_spec["input_slot"], 0)
        # NOTE: "data" is missing due to op lookup failure.
        self.assertNotIn("data", consumer_spec)

    def testServeGraphOpInfoRespondsWithErrorForInvalidGraphId(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # Query the /graphs/op_info route with an invalid graph_id.
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/op_info?run=%s&graph_id=%s&op_name=%s"
            % (run, "nonsensical-graph-id", "Placeholder")
        )

        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": 'Not found: There is no graph with ID "nonsensical-graph-id"'
            },
        )

    def testServeGraphOpInfoRespondsWithErrorForInvalidOpName(self):
        """Get the op info of an op with no inputs."""
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, look up the valid graph_id.
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/digests?run=%s" % run
        )
        data = json.loads(response.get_data())
        digests = data["graph_execution_digests"]
        op_types = [digest["op_type"] for digest in digests]
        op_index = op_types.index("Placeholder")
        graph_id = digests[op_index]["graph_id"]
        # Query the/graphs/op_info route with a valid graph_id and
        # a nonexistent op_name.
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graphs/op_info?run=%s&graph_id=%s&op_name=%s"
            % (run, graph_id, "nonexistent-op-name")
        )

        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": 'Not found: There is no op named "nonexistent-op-name" '
                'in graph with ID "%s"' % graph_id
            },
        )

    def testServeSourceFileListIncludesThisTestFile(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/source_files/list?run=%s" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        source_file_list = json.loads(response.get_data())
        self.assertIsInstance(source_file_list, list)
        self.assertIn([_HOST_NAME, _CURRENT_FILE_FULL_PATH], source_file_list)

    def testServeSourceFileListWithoutRunParamErrors(self):
        # Make request without run param.
        response = self.server.get(_ROUTE_PREFIX + "/source_files/list")
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "run parameter is not provided"},
        )

    def testServeSourceFileContentOfThisTestFile(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, access the source file list, so we can get hold of the index
        # for this file. The index is required for the request to the
        # "/source_files/file" route below.
        response = self.server.get(
            _ROUTE_PREFIX + "/source_files/list?run=%s" % run
        )
        source_file_list = json.loads(response.get_data())
        index = source_file_list.index([_HOST_NAME, _CURRENT_FILE_FULL_PATH])

        response = self.server.get(
            _ROUTE_PREFIX + "/source_files/file?run=%s&index=%d" % (run, index)
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["host_name"], _HOST_NAME)
        self.assertEqual(data["file_path"], _CURRENT_FILE_FULL_PATH)
        with open(__file__, "r") as f:
            lines = f.read().split("\n")
        self.assertEqual(data["lines"], lines)

    def testServeSourceFileWithoutRunErrors(self):
        # Make request without run param.
        response = self.server.get(_ROUTE_PREFIX + "/source_files/file")
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "run parameter is not provided"},
        )

    def testServeSourceFileWithOutOfBoundIndexErrors(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        # First, access the source file list, so we can get hold of the index
        # for this file. The index is required for the request to the
        # "/source_files/file" route below.
        response = self.server.get(
            _ROUTE_PREFIX + "/source_files/list?run=%s" % run
        )
        source_file_list = json.loads(response.get_data())
        self.assertTrue(source_file_list)

        # Use an out-of-bound index.
        invalid_index = len(source_file_list)
        response = self.server.get(
            _ROUTE_PREFIX
            + "/source_files/file?run=%s&index=%d" % (run, invalid_index)
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {
                "error": "Not found: There is no source-code file at index %d"
                % invalid_index
            },
        )

    def testServeStackFrames(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/execution/data?run=%s&begin=0&end=1" % run
        )
        data = json.loads(response.get_data())
        stack_frame_ids = data["executions"][0]["stack_frame_ids"]
        self.assertIsInstance(stack_frame_ids, list)
        self.assertTrue(stack_frame_ids)

        response = self.server.get(
            _ROUTE_PREFIX
            + "/stack_frames/stack_frames?run=%s&stack_frame_ids=%s"
            % (run, ",".join(stack_frame_ids))
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertIsInstance(data, dict)
        stack_frames = data["stack_frames"]
        self.assertIsInstance(stack_frames, list)
        self.assertLen(stack_frames, len(stack_frame_ids))
        for item in stack_frames:
            self.assertIsInstance(item, list)
            self.assertLen(item, 4)  # [host_name, file_path, lineno, function].
            self.assertEqual(item[0], _HOST_NAME)
            self.assertIsInstance(item[1], str)
            self.assertTrue(item[1])
            self.assertIsInstance(item[2], int)
            self.assertGreaterEqual(item[2], 1)
            self.assertIsInstance(item[3], str)
            self.assertTrue(item[3])
        # Assert that the current file and current function should be in the
        # stack frames.
        frames_for_this_function = list(
            filter(
                lambda frame: frame[0] == _HOST_NAME
                and frame[1] == _CURRENT_FILE_FULL_PATH
                and frame[3] == "testServeStackFrames",
                stack_frames,
            )
        )
        self.assertLen(frames_for_this_function, 1)

    def testServeStackFramesWithMissingStackFrameIdParamErrors(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            _ROUTE_PREFIX + "/stack_frames/stack_frames?run=%s" % run
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Missing stack_frame_ids parameter"},
        )

    def testServeStackFramesWithMissingStackFrameIdParamErrors(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        response = self.server.get(
            # Use empty value for the stack_frame_ids parameter.
            _ROUTE_PREFIX
            + "/stack_frames/stack_frames?run=%s&stack_frame_ids=" % run
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Empty stack_frame_ids parameter"},
        )

    def testServeStackFramesWithMissingStackFrameIdParamErrors(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()
        invalid_stack_frme_id = "nonsense-stack-frame-id"
        response = self.server.get(
            # Use empty value for the stack_frame_ids parameter.
            _ROUTE_PREFIX
            + "/stack_frames/stack_frames?run=%s&stack_frame_ids=%s"
            % (run, invalid_stack_frme_id)
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertRegex(
            json.loads(response.get_data())["error"],
            "Not found: Cannot find stack frame with ID"
            ".*nonsense-stack-frame-id.*",
        )


if __name__ == "__main__":
    tf.test.main()
