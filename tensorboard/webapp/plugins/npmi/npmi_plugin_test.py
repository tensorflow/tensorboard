# -*- coding: utf-8 -*-
# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Integration tests for the nPMI plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections.abc
import os
import numpy as np
import tensorflow as tf

from tensorboard import plugin_util
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.plugins import base_plugin
from tensorboard.webapp.plugins.npmi import npmi_plugin
from tensorboard.webapp.plugins.npmi import summary
from tensorboard.util import test_util


tf.compat.v1.enable_v2_behavior()


class NPMIPluginTest(tf.test.TestCase):
  def setUp(self):
    self.logdir = self.get_temp_dir()

  def create_plugin(self, generate_testdata=True):
    if generate_testdata:
      self.generate_testdata()

    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(self.logdir)
    multiplexer.Reload()

    provider = data_provider.MultiplexerDataProvider(
      multiplexer, self.logdir
    )

    ctx = base_plugin.TBContext(
      logdir=self.logdir, multiplexer=multiplexer, data_provider=provider
    )

    return npmi_plugin.NPMIPlugin(ctx)

  def generate_testdata(self):
    run_names = ["run_1", "run_2"]
    ground_truth = {
        "run_1": [
            ['Description', 'A', 'B'],
            ['name_1', '0.1', '0.3'],
            ['name_2', '0.2', '0.4'],
        ],
        "run_2": [
            ['Description', 'A', 'B'],
            ['name_1', '0.3', '0.5'],
            ['name_2', '0.2', '0.1'],
        ]
    }
    for run_name in run_names:
      subdir = os.path.join(self.logdir, run_name)
      writer = tf.compat.v2.summary.create_file_writer(subdir)
      data = ground_truth[run_name]

      python_result = []
      python_annotations = []
      python_classes = []

      for row_index, row in enumerate(data):
        if row_index > 0:
          python_result.append([])
        for col_index, column in enumerate(row):
          if row_index == 0:
            if col_index > 0:
              python_classes.append(column)
          else:
            if col_index == 0:
              python_annotations.append(column)
            else:
              python_result[len(python_result) - 1].appen(column)


      with writer.as_default():
        tensor_result = tf.convert_to_tensor(python_result)
        tensor_annotations = tf.convert_to_tensor(python_annotations)
        tensor_classes = tf.convert_to_tensor(python_classes)
        summary.metric_results('metric_results', 'test', tensor_result, 1)
        summary.metric_results('metric_annotations', 'test', tensor_annotations, 1)
        summary.metric_results('metric_classes', 'test', tensor_classes, 1)
      writer.close()

    def testRoutesProvided(self):
      plugin = self.create_plugin()
      routes = plugin.get_plugin_apps()
      self.assertIsInstance(routes["/tags"], collections.abc.Callable)
      self.assertIsInstance(routes["/annotations"], collections.abc.Callable)
      self.assertIsInstance(routes["/metrics"], collections.abc.Callable)
      self.assertIsInstance(routes["/values"], collections.abc.Callable)

    def testIsActiveReturnsFalse(self):
      """The plugin should always return false because this is now handled
      by TensorBoard core."""
      plugin = self.create_plugin(generate_testdata=False)
      self.assertFalse(True)


if __name__ == "__main__":
  tf.test.main()
