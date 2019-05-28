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
"""Lite demo for TensorBoard."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import datetime
import os
import sys

from absl import app

import tensorflow as tf
from tensorboard.plugins.lite import lite_demo_model


def main(_):
  logdir = FLAGS.logdir
  assert logdir, "--logdir should not be empty. Got: {}".format(logdir)
  if not tf.io.gfile.exists(logdir):
    tf.io.gfile.makedirs(logdir)

  run_name = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
  run_logdir = os.path.join(logdir, run_name)
  export_dir = os.path.join(logdir, run_name, "exported_saved_model")
  model = lite_demo_model.generate_run(run_logdir, export_dir)

  input_array = [i.op.name for i in model.inputs]
  output_array = [i.op.name for i in model.outputs]
  print("-------------------------------------")
  print("Generated model. Please run demo with command:")
  print("  tensorboard --logdir=\"%s\"" % logdir)
  print("")
  print("Then, convert to TFLite model with:")
  print("  input_array=%s" % input_array)
  print("  output_array=%s" % output_array)
  print("-------------------------------------")


if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument(
      '--logdir',
      type=str,
      default='/tmp/lite-demo',
      help='Summaries log directory')
  FLAGS, unparsed = parser.parse_known_args()
  app.run(main=main, argv=[sys.argv[0]] + unparsed)
