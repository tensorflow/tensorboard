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
import json
import os

import tensorflow as tf

from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
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


class LitePluginTest(tf.test.TestCase):

  def setUp(self):
    super(LitePluginTest, self).setUp()
    logdir = os.path.join(self.get_temp_dir(), 'logdir')
    run_logdir = os.path.join(logdir, "0")
    saved_model_dir = os.path.join(logdir, "0", "exported_saved_model")
    model = lite_demo_model.generate_run(run_logdir, saved_model_dir)

    self.input_arrays = [i.op.name for i in model.inputs]
    self.output_arrays = [o.op.name for o in model.outputs]

    # Create a multiplexer for reading the data we just wrote.
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(logdir)
    multiplexer.Reload()
    context = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)

    self.plugin = lite_plugin.LitePlugin(context)
    wsgi_app = application.TensorBoardWSGIApp(
        logdir, [self.plugin], multiplexer, reload_interval=-1, path_prefix='')
    self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)
    multiplexer.Reload()
    self.routes = self.plugin.get_plugin_apps()

  def _DeserializeResponse(self, byte_content):
    return json.loads(byte_content.decode('utf-8'))

  def test_plugin_is_not_active(self):
    if not lite_backend.is_supported:
      return  # Test conditionally.
    empty_logdir = os.path.join(self.get_temp_dir(), 'empty_logdir')
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(empty_logdir)
    multiplexer.Reload()
    context = base_plugin.TBContext(
        logdir=empty_logdir, multiplexer=multiplexer)
    plugin = lite_plugin.LitePlugin(context)
    self.assertFalse(plugin.is_active())

  def test_plugin_is_active(self):
    if not lite_backend.is_supported:
      return  # Test conditionally.
    # The set up for this test generates relevant data.
    self.assertTrue(self.plugin.is_active())
    
  def test_routes_provided(self):
    self.assertIsInstance(self.routes['/list_supported_ops'], collections.Callable)
    self.assertIsInstance(self.routes['/list_saved_models'], collections.Callable)
    self.assertIsInstance(self.routes['/convert'], collections.Callable)
    self.assertIsInstance(self.routes['/script'], collections.Callable)

  def test_convert_pass(self):
    if not lite_backend.is_supported:
      return  # Test conditionally.
    json_data = json.dumps({
      'input_arrays': self.input_arrays,
      'output_arrays': self.output_arrays,
      'saved_model': os.path.join('0', 'exported_saved_model'),
    })
    response = self.server.post(
      '/data/plugin/lite/convert', data={'data': json_data})
    self.assertEqual(200, response.status_code)
    result = self._DeserializeResponse(response.get_data())
    import pprint
    pprint.pprint(result)
    self.assertEqual(result.get('result'), 'success')
    self.assertIsNotNone(result.get('tabs'))

  def test_convert_failed(self):
    if not lite_backend.is_supported:
      return  # Test conditionally.
    json_data = json.dumps({
      'input_arrays': self.input_arrays,
      'output_arrays': self.output_arrays,
      'saved_model': 'wrong_saved_model',
    })
    response = self.server.post(
      '/data/plugin/lite/convert', data={'data': json_data})
    self.assertEqual(200, response.status_code)
    result = self._DeserializeResponse(response.get_data())
    self.assertEqual(result.get('result'), 'failed')
    self.assertIsNotNone(result.get('tabs'))

    json_data = json.dumps({
      'input_arrays': ['wrong_input'],
      'output_arrays': self.output_arrays,
      'saved_model': 'exported_saved_model',
    })
    response = self.server.post(
      '/data/plugin/lite/convert', data={'data': json_data})
    self.assertEqual(200, response.status_code)
    result = self._DeserializeResponse(response.get_data())
    self.assertEqual(result.get('result'), 'failed')
    self.assertIsNotNone(result.get('tabs'))

if __name__ == '__main__':
  tf.test.main()
