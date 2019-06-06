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
"""Unit tests for the lite_backend."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import tensorflow as tf

from tensorboard.plugins.lite import lite_backend
from tensorboard.plugins.lite import lite_demo_model


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

  def test_get_suggestion(self):
    error_message = "<random message>"
    suggestion, tips_link = lite_backend.get_suggestion(error_message)
    self.assertFalse(suggestion)
    self.assertFalse(tips_link)

    error_message = "... both shapes must be equal ..."
    suggestion, tips_link = lite_backend.get_suggestion(error_message)
    self.assertTrue(suggestion)
    self.assertFalse(tips_link)

    error_message = "... <random message> + %s" % lite_backend.ISSUE_LINK
    suggestion, tips_link = lite_backend.get_suggestion(error_message)
    self.assertTrue(suggestion)
    self.assertTrue(tips_link)


if __name__ == '__main__':
  tf.test.main()
