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
"""Tests for Debugger V2 Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tempfile

import tensorflow as tf

from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger_v2 import debugger_v2_plugin


class DebuggerV2PluginTest(tf.test.TestCase):

  def testInstantiatePlugin(self):
    dummy_logdir = tempfile.mkdtemp()
    context = base_plugin.TBContext(logdir=dummy_logdir)
    plugin = debugger_v2_plugin.DebuggerV2Plugin(context)
    self.assertTrue(plugin)


if __name__ == "__main__":
  tf.test.main()
