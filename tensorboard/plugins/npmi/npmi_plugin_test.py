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
import json
import numpy as np
import tensorflow as tf

from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.plugins import base_plugin
from tensorboard.plugins.npmi import npmi_plugin
from tensorboard.plugins.npmi import summary


tf.compat.v1.enable_v2_behavior()


class NpmiPluginTest(tf.test.TestCase):
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

        return npmi_plugin.NpmiPlugin(ctx)

    def generate_testdata(self):
        run_names = ["run_1", "run_2"]
        ground_truth = {
            "run_1": [
                ["Description", "A", "B"],
                ["name_1", 1.0, -1.0],
                ["name_2", -0.5, 0.5],
            ],
            "run_2": [
                ["Description", "A", "B"],
                ["name_1", 1.0, -1.0],
                ["name_2", -0.5, np.nan],
            ],
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
                            python_result[len(python_result) - 1].append(column)
            with writer.as_default():
                tensor_result = tf.convert_to_tensor(python_result)
                tensor_annotations = tf.convert_to_tensor(python_annotations)
                tensor_classes = tf.convert_to_tensor(python_classes)
                summary.npmi_values(tensor_result, 1)
                summary.npmi_annotations(tensor_annotations, 1)
                summary.npmi_metrics(tensor_classes, 1)
            writer.close()

    def testRoutesProvided(self):
        plugin = self.create_plugin()
        routes = plugin.get_plugin_apps()
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)
        self.assertIsInstance(routes["/annotations"], collections.abc.Callable)
        self.assertIsInstance(routes["/metrics"], collections.abc.Callable)
        self.assertIsInstance(routes["/values"], collections.abc.Callable)

    def testTags(self):
        plugin = self.create_plugin()
        tags = plugin.tags_impl(context.RequestContext(), experiment="exp")
        tags = json.loads(tags)
        gt_runs = ["run_1", "run_2"]
        gt_tags = ["_npmi_/annotations", "_npmi_/metrics", "_npmi_/values"]
        self.assertItemsEqual(gt_runs, tags.keys())
        self.assertItemsEqual(gt_tags, tags["run_1"])
        self.assertItemsEqual(gt_tags, tags["run_2"])

    def testAnnotations(self):
        plugin = self.create_plugin()
        annotations = plugin.annotations_impl(
            context.RequestContext(), experiment="exp",
        )
        annotations = json.loads(annotations)
        self.assertItemsEqual(["name_1", "name_2"], annotations["run_1"])
        self.assertItemsEqual(["name_1", "name_2"], annotations["run_2"])

    def testMetrics(self):
        plugin = self.create_plugin()
        metrics = plugin.metrics_impl(
            context.RequestContext(), experiment="exp",
        )
        metrics = json.loads(metrics)
        self.assertItemsEqual(["A", "B"], metrics["run_1"])
        self.assertItemsEqual(["A", "B"], metrics["run_2"])

    def testValues(self):
        plugin = self.create_plugin()
        values = plugin.values_impl(context.RequestContext(), experiment="exp")
        values = json.loads(values)
        self.assertItemsEqual([1.0, -1.0], values["run_1"][0])
        self.assertItemsEqual([0.5, -0.5], values["run_1"][1])
        self.assertItemsEqual([1.0, -1.0], values["run_2"][0])
        self.assertItemsEqual([-0.5, None], values["run_2"][1])

    def testIsActiveReturnsFalse(self):
        """The plugin should always return false because this is now handled
        by TensorBoard core."""
        plugin = self.create_plugin(generate_testdata=False)
        self.assertFalse(plugin.is_active())


if __name__ == "__main__":
    tf.test.main()
