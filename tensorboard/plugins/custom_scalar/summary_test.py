
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
"""Tests for the layout module."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins.custom_scalar import summary
from tensorboard.plugins.custom_scalar import metadata
from tensorboard.plugins.custom_scalar import layout_pb2


class LayoutTest(tf.test.TestCase):

  def setUp(self):
    super(LayoutTest, self).setUp()
    self.logdir = self.get_temp_dir()

  def testSetLayout(self):
    layout_proto_to_write = layout_pb2.Layout(
        category=[
            layout_pb2.Category(
                title='mean biases',
                chart=[
                    layout_pb2.Chart(
                        title='mean layer biases',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'mean/layer\d+/biases'],
                        )),
                ]),
            layout_pb2.Category(
                title='std weights',
                chart=[
                    layout_pb2.Chart(
                        title='stddev layer weights',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'stddev/layer\d+/weights'],
                        )),
                    ]),
            layout_pb2.Category(
                title='cross entropy ... and maybe some other values',
                chart=[
                    layout_pb2.Chart(
                        title='cross entropy',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'cross entropy'],
                        )),
                    layout_pb2.Chart(
                        title='accuracy',
                        margin=layout_pb2.MarginChartContent(
                            series=[
                                layout_pb2.MarginChartContent.Series(
                                    value='accuracy',
                                    lower='accuracy_lower_margin',
                                    upper='accuracy_upper_margin')
                            ]
                        )),
                    layout_pb2.Chart(
                        title='max layer weights',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'max/layer1/.*', r'max/layer2/.*'],
                        )),
                ],
                closed=True)
        ])

    # Write the data as a summary for the '.' run.
    with tf.Session() as s, tf.summary.FileWriter(self.logdir) as writer:
      writer.add_summary(s.run(summary.op(layout_proto_to_write)))

    # Read the data from disk.
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(self.logdir)
    multiplexer.Reload()
    tensor_events = multiplexer.Tensors('.', metadata.CONFIG_SUMMARY_TAG)
    self.assertEqual(1, len(tensor_events))

    # Parse the data.
    string_array = tf.make_ndarray(tensor_events[0].tensor_proto)
    content = np.asscalar(string_array)
    layout_proto_from_disk = layout_pb2.Layout()
    layout_proto_from_disk.ParseFromString(tf.compat.as_bytes(content))

    # Verify the content.
    self.assertProtoEquals(layout_proto_to_write, layout_proto_from_disk)


if __name__ == "__main__":
  tf.test.main()
