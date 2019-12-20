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
import shutil
import tempfile

import tensorflow as tf
from werkzeug import test as werkzeug_test  # pylint: disable=wrong-import-order
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger_v2 import debugger_v2_plugin
from tensorboard.util import test_util


def _generate_tfdbg_v2_data(logdir):
    """Generate a simple dump of tfdbg v2 data by running a TF2 program.

    The run is instrumented by the enable_dump_debug_info() API.

    The instrumented program is intentionally diverse in:
      - Execution paradigm: eager + tf.function
      - Control flow (TF while loop)
      - dtype and shape
    in order to faciliate testing.

    Args:
      logdir: Logdir to write the debugger data to.
    """
    writer = tf.debugging.experimental.enable_dump_debug_info(
        logdir, circular_buffer_size=-1
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
        writer.FlushNonExecutionFiles()
        writer.FlushExecutionFiles()
    finally:
        tf.debugging.experimental.disable_dump_debug_info()


_ROUTE_PREFIX = "/data/plugin/debugger-v2"


@test_util.run_v2_only("tfdbg2 is not available in r1.")
class DebuggerV2PluginTest(tf.test.TestCase):
    def setUp(self):
        super(DebuggerV2PluginTest, self).setUp()
        self.logdir = tempfile.mkdtemp()
        context = base_plugin.TBContext(logdir=self.logdir)
        self.plugin = debugger_v2_plugin.DebuggerV2Plugin(context)
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)

    def tearDown(self):
        if os.path.isdir(self.logdir):
            shutil.rmtree(self.logdir)
        super(DebuggerV2PluginTest, self).tearDown()

    def testPluginIsNotActiveByDefault(self):
        self.assertFalse(self.plugin.is_active())

    def testServeRunsWithoutExistingRuns(self):
        response = self.server.get(_ROUTE_PREFIX + "/runs")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(json.loads(response.get_data()), [])

    def testServeRunsWithExistingRuns(self):
        _generate_tfdbg_v2_data(self.logdir)
        response = self.server.get(_ROUTE_PREFIX + "/runs")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("content-type")
        )
        self.assertEqual(
            json.loads(response.get_data()), ["__default_debugger_run__"]
        )


if __name__ == "__main__":
    tf.test.main()
