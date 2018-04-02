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
"""Create sample PR curve summary data.

The logic below logs scalar data and then lays out the custom scalars dashboard.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard import summary as summary_lib
from tensorboard.plugins.custom_scalar import layout_pb2


LOGDIR = '/tmp/custom_scalar_demo'


def run():
  """Run custom scalar demo and generate event files."""
  step = tf.placeholder(tf.float32, shape=[])

  with tf.name_scope('loss'):
    # Specify 2 different loss values, each tagged differently.
    summary_lib.scalar('foo', tf.pow(0.9, step))
    summary_lib.scalar('bar', tf.pow(0.85, step + 2))

    # Log metric baz as well as upper and lower bounds for a margin chart.
    middle_baz_value = step + 4 * tf.random_uniform([]) - 2
    summary_lib.scalar('baz', middle_baz_value)
    summary_lib.scalar('baz_lower',
                       middle_baz_value - 6.42 - tf.random_uniform([]))
    summary_lib.scalar('baz_upper',
                       middle_baz_value + 6.42 + tf.random_uniform([]))

  with tf.name_scope('trigFunctions'):
    summary_lib.scalar('cosine', tf.cos(step))
    summary_lib.scalar('sine', tf.sin(step))
    summary_lib.scalar('tangent', tf.tan(step))

  merged_summary = tf.summary.merge_all()

  with tf.Session() as sess, tf.summary.FileWriter(LOGDIR) as writer:
    # We only need to specify the layout once (instead of per step).
    layout_summary = summary_lib.custom_scalar_pb(
        layout_pb2.Layout(category=[
            layout_pb2.Category(
                title='losses',
                chart=[
                    layout_pb2.Chart(
                        title='losses',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'loss(?!.*margin.*)'],)),
                    layout_pb2.Chart(
                        title='baz',
                        margin=layout_pb2.MarginChartContent(
                            series=[
                                layout_pb2.MarginChartContent.Series(
                                    value='loss/baz/scalar_summary',
                                    lower='loss/baz_lower/scalar_summary',
                                    upper='loss/baz_upper/scalar_summary'
                                ),
                            ],)),
                ]),
            layout_pb2.Category(
                title='trig functions',
                chart=[
                    layout_pb2.Chart(
                        title='wave trig functions',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[
                                r'trigFunctions/cosine', r'trigFunctions/sine'
                            ],)),
                    # The range of tangent is different. Give it its own chart.
                    layout_pb2.Chart(
                        title='tan',
                        multiline=layout_pb2.MultilineChartContent(
                            tag=[r'trigFunctions/tangent'],)),
                ],
                # This category we care less about. Make it initially closed.
                closed=True),
        ]))
    writer.add_summary(layout_summary)

    for i in xrange(42):
      summary = sess.run(merged_summary, feed_dict={step: i})
      writer.add_summary(summary, global_step=i)


def main(unused_argv):
  print('Saving output to %s.' % LOGDIR)
  run()
  print('Done. Output saved to %s.' % LOGDIR)


if __name__ == '__main__':
  tf.app.run()
