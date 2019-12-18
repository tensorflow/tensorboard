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


def _generate_tfdbg_v2_data(logdir):
    writer = tf.debugging.experimental.enable_dump_debug_info(
        logdir, circular_buffer_size=-1)
    try:
        @tf.function
        def x_plus_y(x, y):
            return x + y

        x = tf.constant(40.0)
        y = tf.constant(2.0)
        x_plus_y(x, y)
        writer.FlushNonExecutionFiles()
        writer.FlushExecutionFiles()
    finally:
        tf.debugging.experimental.disable_dump_debug_info()


_ROUTE_PREFIX = '/data/plugin/debugger-v2'


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
        response = self.server.get(_ROUTE_PREFIX + '/runs')
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers.get("content-type"))
        self.assertEqual(json.loads(response.get_data()), [])

    def testServeRunsWithExistingRuns(self):
        _generate_tfdbg_v2_data(self.logdir)
        response = self.server.get(_ROUTE_PREFIX + '/runs')
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers.get("content-type"))
        self.assertEqual(json.loads(response.get_data()),
                         [debugger_v2_plugin.DEFAULT_DEBUGGER_RUN_NAME])


if __name__ == "__main__":
    tf.test.main()
