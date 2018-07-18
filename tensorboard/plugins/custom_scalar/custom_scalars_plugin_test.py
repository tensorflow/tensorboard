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
"""Integration tests for the Custom Scalars Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import numpy as np
import tensorflow as tf

from google.protobuf import json_format
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.custom_scalar import custom_scalars_plugin
from tensorboard.plugins.custom_scalar import layout_pb2
from tensorboard.plugins.custom_scalar import summary
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.scalar import summary as scalar_summary


class CustomScalarsPluginTest(tf.test.TestCase):

  def __init__(self, *args, **kwargs):
    super(CustomScalarsPluginTest, self).__init__(*args, **kwargs)
    self.logdir = os.path.join(self.get_temp_dir(), 'logdir')
    os.makedirs(self.logdir)

    self.logdir_layout = layout_pb2.Layout(
        category=[
            layout_pb2.Category(
                title='cross entropy',
                chart=[
                    layout_pb2.Chart(
                        title='cross entropy',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'cross entropy'],
                        )),
                ],
                closed=True)
            ]
    )
    self.foo_layout = layout_pb2.Layout(
        category=[
            layout_pb2.Category(
                title='mean biases',
                chart=[
                    layout_pb2.Chart(
                        title='mean layer biases',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'mean/layer0/biases', r'mean/layer1/biases'],
                        )),
                ]
            ),
            layout_pb2.Category(
                title='std weights',
                chart=[
                    layout_pb2.Chart(
                        title='stddev layer weights',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'stddev/layer\d+/weights'],
                        )),
                ]
            ),
            # A category with this name is also present in a layout for a
            # different run (the logdir run) and also contains a duplicate chart
            layout_pb2.Category(
                title='cross entropy',
                chart=[
                    layout_pb2.Chart(
                        title='cross entropy margin chart',
                        margin=layout_pb2.MarginChartContent(
                            series=[
                                layout_pb2.MarginChartContent.Series(
                                    value='cross entropy',
                                    lower='cross entropy lower',
                                    upper='cross entropy upper'),
                            ],
                        )),
                    layout_pb2.Chart(
                        title='cross entropy',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'cross entropy'],
                        )),
                ]
            ),
        ]
    )

    # Generate test data.
    with tf.summary.FileWriter(os.path.join(self.logdir, 'foo')) as writer:
      writer.add_summary(summary.pb(self.foo_layout))
      for step in range(4):
        writer.add_summary(scalar_summary.pb('squares', step * step), step)

    with tf.summary.FileWriter(os.path.join(self.logdir, 'bar')) as writer:
      for step in range(3):
        writer.add_summary(scalar_summary.pb('increments', step + 1), step)

    # The '.' run lacks scalar data but has a layout.
    with tf.summary.FileWriter(self.logdir) as writer:
      writer.add_summary(summary.pb(self.logdir_layout))

    self.plugin = self.createPlugin(self.logdir)

  def createPlugin(self, logdir):
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(logdir)
    multiplexer.Reload()
    plugin_name_to_instance = {}
    context = base_plugin.TBContext(
        logdir=logdir,
        multiplexer=multiplexer,
        plugin_name_to_instance=plugin_name_to_instance)
    scalars_plugin_instance = scalars_plugin.ScalarsPlugin(context)
    custom_scalars_plugin_instance = custom_scalars_plugin.CustomScalarsPlugin(
        context)
    plugin_instances = [scalars_plugin_instance, custom_scalars_plugin_instance]
    for plugin_instance in plugin_instances:
      plugin_name_to_instance[plugin_instance.plugin_name] = plugin_instance
    return custom_scalars_plugin_instance

  def testDownloadData(self):
    body, mime_type = self.plugin.download_data_impl(
        'foo', 'squares/scalar_summary', 'json')
    self.assertEqual('application/json', mime_type)
    self.assertEqual(4, len(body))
    for step, entry in enumerate(body):
      # The time stamp should be reasonable.
      self.assertGreater(entry[0], 0)
      self.assertEqual(step, entry[1])
      np.testing.assert_allclose(step * step, entry[2])

  def testScalars(self):
    body = self.plugin.scalars_impl('bar', 'increments')
    self.assertTrue(body['regex_valid'])
    self.assertItemsEqual(
        ['increments/scalar_summary'], list(body['tag_to_events'].keys()))
    data = body['tag_to_events']['increments/scalar_summary']
    for step, entry in enumerate(data):
      # The time stamp should be reasonable.
      self.assertGreater(entry[0], 0)
      self.assertEqual(step, entry[1])
      np.testing.assert_allclose(step + 1, entry[2])

  def testMergedLayout(self):
    parsed_layout = layout_pb2.Layout()
    json_format.Parse(self.plugin.layout_impl(), parsed_layout)
    correct_layout = layout_pb2.Layout(
        category=[
            # A category with this name is also present in a layout for a
            # different run (the logdir run)
            layout_pb2.Category(
                title='cross entropy',
                chart=[
                    layout_pb2.Chart(
                        title='cross entropy',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'cross entropy'],
                        )),
                    layout_pb2.Chart(
                        title='cross entropy margin chart',
                        margin=layout_pb2.MarginChartContent(
                            series=[
                                layout_pb2.MarginChartContent.Series(
                                    value='cross entropy',
                                    lower='cross entropy lower',
                                    upper='cross entropy upper'),
                            ],
                        )),
                ],
                closed=True,
            ),
            layout_pb2.Category(
                title='mean biases',
                chart=[
                    layout_pb2.Chart(
                        title='mean layer biases',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'mean/layer0/biases', r'mean/layer1/biases'],
                        )),
                ]
            ),
            layout_pb2.Category(
                title='std weights',
                chart=[
                    layout_pb2.Chart(
                        title='stddev layer weights',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'stddev/layer\d+/weights'],
                        )),
                ]
            ),
        ]
    )
    self.assertProtoEquals(correct_layout, parsed_layout)

  def testLayoutFromSingleRun(self):
    # The foo directory contains 1 single layout.
    local_plugin = self.createPlugin(os.path.join(self.logdir, 'foo'))
    parsed_layout = layout_pb2.Layout()
    json_format.Parse(local_plugin.layout_impl(), parsed_layout)
    self.assertProtoEquals(self.foo_layout, parsed_layout)

  def testNoLayoutFound(self):
    # The bar directory contains no layout.
    local_plugin = self.createPlugin(os.path.join(self.logdir, 'bar'))
    self.assertDictEqual({}, local_plugin.layout_impl())

  def testIsActive(self):
    self.assertTrue(self.plugin.is_active())

  def testIsNotActiveDueToNoLayout(self):
    # The bar directory contains scalar data but no layout.
    local_plugin = self.createPlugin(os.path.join(self.logdir, 'bar'))
    self.assertFalse(local_plugin.is_active())

  def testIsNotActiveDueToNoScalarsData(self):
    # Generate a directory with a layout but no scalars data.
    directory = os.path.join(self.logdir, 'no_scalars')
    with tf.summary.FileWriter(directory) as writer:
      writer.add_summary(summary.pb(self.logdir_layout))

    local_plugin = self.createPlugin(directory)
    self.assertFalse(local_plugin.is_active())

if __name__ == "__main__":
  tf.test.main()
