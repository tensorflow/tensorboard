
# -*- coding: utf-8 -*-
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
"""Integration tests for the pr_curves plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import csv
import os.path

from six import StringIO
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.pr_curve import pr_curve_demo
from tensorboard.plugins.pr_curve import pr_curves_plugin


class PrCurvesPluginTest(tf.test.TestCase):

  def setUp(self, *args, **kwargs):
    super(PrCurveTest, self).setUp(*args, **kwargs)
    logdir = self.get_temp_dir()
    tf.reset_default_graph()

    # Generate data.
    pr_curve_demo.run_all(
        logdir=logdir,
        steps=3,
        thresholds=5,
        verbose=False)

    # Create a multiplexer for reading the data we just wrote.
    self.multiplexer = event_multiplexer.EventMultiplexer()
    self.multiplexer.AddRunsFromDirectory(logdir)
    self.multiplexer.Reload()

    context = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
    self.plugin = pr_curves_plugin.PrCurvesPlugin(context)

  def testRoutesProvided(self):
    """Tests that the plugin offers the correct routes."""
    routes = self.plugin.get_plugin_apps()
    self.assertIsInstance(routes['/tags'], collections.Callable)
    self.assertIsInstance(routes['/pr_curves'], collections.Callable)
    self.assertIsInstance(routes['/available_steps'], collections.Callable)

  def testTagsProvided(self):
    """Tests that tags are provided."""
    self.assertDictEqual({}, self.plugin.tags_impl())
