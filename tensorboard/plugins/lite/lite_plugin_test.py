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
"""Integration tests for the lite plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import functools
import shutil
import os.path

import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.lite import lite_backend
from tensorboard.plugins.lite import lite_demo_model
from tensorboard.plugins.lite import lite_plugin
from tensorboard.plugins.lite import lite_plugin_loader


class LiteBackendTest(tf.test.TestCase):

  def test_has_attr_is_supported(self):
    self.assertTrue(hasattr(lite_backend, 'is_supported'))

  def test_get_potentially_supported_ops(self):
    if not lite_backend.is_supported:
      return  # Test conditionally.
    result = lite_backend.get_potentially_supported_ops()
    self.assertIsInstance(result, list)
    self.assertIn("Add", result)
    self.assertIn("Mul", result)

  def test_get_saved_model_dirs(self):
    logdir = os.path.join(self.get_temp_dir(), 'logdir')
    run_logdir = os.path.join(logdir, "0")
    model = lite_demo_model.generate_run(run_logdir)

    tf.keras.experimental.export_saved_model(model, os.path.join(logdir, 'exported_saved_model'))
    lite_backend.safe_makedirs(os.path.join(logdir, '1'))
    lite_backend.safe_makedirs(os.path.join(logdir, '2', 'a'))
    tf.keras.experimental.export_saved_model(model, os.path.join(logdir, '1', 'saved'))
    tf.keras.experimental.export_saved_model(model, os.path.join(logdir, '2', 'a', 'saved'))

    saved_model_dirs = lite_backend.get_saved_model_dirs(logdir)
    print('saved_model_dirs %s' % saved_model_dirs)
    expected = set([
      'exported_saved_model',
      os.path.join('1', 'saved'),
      os.path.join('2', 'a', 'saved'),
    ])
    self.assertAllInSet(saved_model_dirs, expected)

  def test_script_from_saved_model(self):
    saved_model_dir = "my_dir/saved_model_folder"
    tflite_file = 'my_tflite_model.tflite'
    input_arrays = ["inputs/tensor"]
    output_arrays = ["outputs/logits"]
    template = lite_backend.script_from_saved_model(saved_model_dir, tflite_file, input_arrays, output_arrays)
    self.assertTrue(template)
    self.assertIn(saved_model_dir, template)
    self.assertIn(tflite_file, template)
    self.assertIn(str(input_arrays), template)
    self.assertIn(str(output_arrays), template)

  def test_execute(self):
    if not lite_backend.is_supported:
      return  # Test conditionally.

    logdir = os.path.join(self.get_temp_dir(), 'logdir')
    run_logdir = os.path.join(logdir, "0")
    saved_model_dir = os.path.join(logdir, "0", "exported_saved_model")
    model = lite_demo_model.generate_run(logdir, saved_model_dir)

    tflite_file = os.path.join(self.get_temp_dir(), 'test.tflite')
    input_arrays = [i.op.name for i in model.inputs]
    output_arrays = [o.op.name for o in model.outputs]

    # OK case:
    script = lite_backend.script_from_saved_model(saved_model_dir, tflite_file, input_arrays, output_arrays)
    success, stdout, stderr = lite_backend.execute(script, verbose=True)
    self.assertTrue(success)
    self.assertTrue(stdout)

    # Failed case:
    output_arrays = ["non_exited_tensor"]
    script = lite_backend.script_from_saved_model(saved_model_dir, tflite_file, input_arrays, output_arrays)
    success, stdout, stderr = lite_backend.execute(script, verbose=True)
    self.assertFalse(success)
    self.assertTrue(stderr)


class LitePluginLoaderTest(tf.test.TestCase):

  def setUp(self):
    super(LitePluginLoaderTest, self).setUp()
    multiplexer = event_multiplexer.EventMultiplexer()
    self.context = base_plugin.TBContext(multiplexer=multiplexer)
    # Keep state.
    self.old_is_supported = lite_backend.is_supported

  def tearDown(self):
    # Resume state.
    lite_backend.is_supported = self.old_is_supported

  def test_load_if_supported(self):
    lite_backend.is_supported = True
    plugin = lite_plugin_loader.LitePluginLoader().load(self.context)
    self.assertIsNotNone(plugin)
    self.assertIsInstance(plugin, lite_plugin.LitePlugin)

  def test_load_if_not_supported(self):
    lite_backend.is_supported = False
    plugin = lite_plugin_loader.LitePluginLoader().load(self.context)
    self.assertIsNone(plugin)


class LitePluginTest(tf.test.TestCase):

  def setUp(self):
    super(LitePluginTest, self).setUp()
    logdir = os.path.join(self.get_temp_dir(), 'logdir')
    run_logdir = os.path.join(logdir, "0")
    saved_model_dir = os.path.join(logdir, "0", "exported_saved_model")
    lite_demo_model.generate_run(run_logdir, saved_model_dir)

    # Create a multiplexer for reading the data we just wrote.
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(logdir)
    multiplexer.Reload()
    context = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
    self.plugin = lite_plugin.LitePlugin(context)


  def testPluginIsNotActive(self):
    """Tests that the plugin is inactive when no relevant data exists."""
    empty_logdir = os.path.join(self.get_temp_dir(), 'empty_logdir')
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(empty_logdir)
    multiplexer.Reload()
    context = base_plugin.TBContext(
        logdir=empty_logdir, multiplexer=multiplexer)
    plugin = lite_plugin.LitePlugin(context)
    self.assertFalse(plugin.is_active())

  def testPluginIsActive(self):
    """Tests that the plugin is active when relevant data exists."""
    # The set up for this test generates relevant data.
    self.assertTrue(self.plugin.is_active())


if __name__ == '__main__':
  tf.test.main()
