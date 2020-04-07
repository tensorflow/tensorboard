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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os
import six
import socket

import tensorflow as tf
from werkzeug import test as werkzeug_test  # pylint: disable=wrong-import-order
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger_v2 import debug_data_multiplexer
from tensorboard.plugins.debugger_v2 import debugger_v2_plugin
from tensorboard.util import test_util


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

        x = tf.constant([1, 3, 3, 7], dtype=tf.float32)
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


@test_util.run_v2_only("tfdbg2 is not available in r1.")
class DebuggerV2PluginTest(tf.test.TestCase):
    def setUp(self):
        super(DebuggerV2PluginTest, self).setUp()
        self.logdir = self.get_temp_dir()
        context = base_plugin.TBContext(logdir=self.logdir)
        self.plugin = debugger_v2_plugin.DebuggerV2Plugin(context)
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)
        # The multiplexer reads data asynchronously on a separate thread, so
        # as not to block the main thread of the TensorBoard backend. During
        # unit test, we disable the asynchronous behavior, so that we can
        # load the debugger data synchronously on the main thread and get
        # determinisic behavior in the tests.
        def run_in_background_mock(target):
            target()

        self.run_in_background_patch = tf.compat.v1.test.mock.patch.object(
            debug_data_multiplexer, "run_in_background", run_in_background_mock
        )
        self.run_in_background_patch.start()

    def tearDown(self):
        self.run_in_background_patch.stop()
        super(DebuggerV2PluginTest, self).tearDown()

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
        self.assertTrue(self.plugin.is_active())

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
                "alerts_breakdown": {"InfNanAlert": 3,},
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
            {"begin": 0, "end": 0, "num_digests": 3, "execution_digests": [],},
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
            + "/graph_execution/digests?run=%s&begin=0&end=3" % run
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        data = json.loads(response.get_data())
        self.assertEqual(data["begin"], 0)
        self.assertEqual(data["end"], 3)
        self.assertEqual(data["num_digests"], 186)
        digests = data["graph_execution_digests"]
        self.assertLen(digests, 3)
        self.assertGreater(digests[0]["wall_time"], 0)
        self.assertEqual(digests[0]["op_type"], "Placeholder")
        self.assertEqual(digests[0]["output_slot"], 0)
        self.assertTrue(digests[0]["op_name"])
        self.assertTrue(digests[0]["graph_id"])

        self.assertGreaterEqual(
            digests[1]["wall_time"], digests[0]["wall_time"]
        )
        self.assertEqual(digests[1]["op_type"], "Placeholder")
        self.assertEqual(digests[1]["output_slot"], 0)
        self.assertTrue(digests[1]["op_name"])
        self.assertNotEqual(digests[1]["op_name"], digests[0]["op_name"])
        self.assertTrue(digests[0]["graph_id"])

        self.assertGreaterEqual(
            digests[2]["wall_time"], digests[1]["wall_time"]
        )
        # The unstack() function uses the Unpack op under the hood.
        self.assertEqual(digests[2]["op_type"], "Unpack")
        self.assertEqual(digests[2]["output_slot"], 0)
        self.assertTrue(digests[2]["op_name"])
        self.assertTrue(digests[0]["graph_id"])

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
        self.assertEqual(data["end"], 186)
        self.assertEqual(data["num_digests"], 186)
        digests = data["graph_execution_digests"]
        self.assertLen(digests, 186)
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

        # begin = 0; end = 200
        response = self.server.get(
            _ROUTE_PREFIX
            + "/graph_execution/digests?run=%s&begin=0&end=200" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (200) out of bounds (186)"},
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
        self.assertStartsWith(graph_exec["op_type"], "Placeholder")
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 0)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        # [tensor_id, element_count, nan_count, neg_inf_count, pos_inf_count].
        self.assertEqual(
            graph_exec["debug_tensor_value"], [1.0, 4.0, 0.0, 0.0, 0.0]
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
        self.assertStartsWith(graph_exec["op_type"], "Placeholder")
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 0)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        # [tensor_id, element_count, nan_count, neg_inf_count, pos_inf_count].
        self.assertEqual(
            graph_exec["debug_tensor_value"], [1.0, 4.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

        graph_exec = data["graph_executions"][1]
        self.assertStartsWith(graph_exec["op_type"], "Placeholder")
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 0)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        self.assertEqual(
            graph_exec["debug_tensor_value"], [2.0, 4.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

        graph_exec = data["graph_executions"][2]
        # The unstack() function uses the Unpack op under the hood.
        self.assertStartsWith(graph_exec["op_type"], "Unpack")
        self.assertTrue(graph_exec["op_name"])
        self.assertEqual(graph_exec["output_slot"], 0)
        self.assertTrue(graph_exec["graph_id"])
        self.assertGreaterEqual(len(graph_exec["graph_ids"]), 1)
        self.assertEqual(graph_exec["graph_ids"][-1], graph_exec["graph_id"])
        self.assertEqual(
            graph_exec["debug_tensor_value"], [3.0, 1.0, 0.0, 0.0, 0.0]
        )
        self.assertEndsWith(graph_exec["device_name"], _DEFAULT_DEVICE_SUFFIX)

    def testServeGraphExecutionDataObjectsOutOfBoundsError(self):
        _generate_tfdbg_v2_data(self.logdir)
        run = self._getExactlyOneRun()

        # _generate_tfdbg_v2_data() generates exactly 186 graph-execution
        # traces.
        # begin = 0; end = 187
        response = self.server.get(
            _ROUTE_PREFIX + "/graph_execution/data?run=%s&begin=0&end=187" % run
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()),
            {"error": "Invalid argument: end index (187) out of bounds (186)"},
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
            self.assertIsInstance(item[1], six.string_types)
            self.assertTrue(item[1])
            self.assertIsInstance(item[2], int)
            self.assertGreaterEqual(item[2], 1)
            self.assertIsInstance(item[3], six.string_types)
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
        self.assertRegexpMatches(
            json.loads(response.get_data())["error"],
            "Not found: Cannot find stack frame with ID"
            ".*nonsense-stack-frame-id.*",
        )


if __name__ == "__main__":
    tf.test.main()
