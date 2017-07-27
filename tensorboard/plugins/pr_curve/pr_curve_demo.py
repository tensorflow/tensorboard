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

We have 3 classes: R, G, and B. We generate colors within RGB space from 3
normal distributions (1 at each corner of the color triangle: [255, 0, 0],
[0, 255, 0], and [0, 0, 255]).

The true label of each random color is associated with the normal distribution
that generated it.

Using 3 other normal distributions (over the distance eac color is from a corner
of the color triangle - RGB), we then compute the probability that each color
belongs to the class. We use those probabilities to generate PR curves.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import math
import os.path

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.plugins.pr_curve import summary

FLAGS = tf.flags.FLAGS

tf.flags.DEFINE_string('logdir', '/tmp/pr_curve_demo',
                       'Directory into which to write TensorBoard data.')

tf.flags.DEFINE_integer('steps', 10,
                        'Number of steps to generate for each PR curve. '
                        'Should be less than 40 for reasons in the code.')


def start_runs(logdir, steps, run_name, doubly_weigh_blues):
  """Generate a PR curve with precision and recall evenly weighed.
  
  Arguments:
    logdir: The directory into which to store all the runs' data.
    steps: The number of steps to run for.
    run_name: The name of the run.
    doubly_weigh_blues: Weigh probabilities for whether a color is blue twice
        as much as default.
  """
  tf.reset_default_graph()
  
  # Create a normal distribution layer used to generate true color labels.
  channel_distribution = tf.distributions.Normal(loc=0., scale=42.)

  # Sample the distribution to generate colors. Lets generate different numbers
  # of each color. The first dimension is the count of examples.

  # Generate reds.
  number_of_reds = 100
  true_reds = tf.clip_by_value(
      tf.concat([
          255 - tf.abs(channel_distribution.sample([number_of_reds, 1])),
          tf.abs(channel_distribution.sample([number_of_reds, 2]))], axis=1),
      0, 255)

  # Generate greens.
  number_of_greens = 200
  true_greens = tf.clip_by_value(
      tf.concat([
          tf.abs(channel_distribution.sample([number_of_greens, 1])),
          255 - tf.abs(channel_distribution.sample([number_of_greens, 1])),
          tf.abs(channel_distribution.sample([number_of_greens, 1]))], axis=1),
      0, 255)

  # Generate blues.
  number_of_blues = 150
  true_blues = tf.clip_by_value(
      tf.concat([
          tf.abs(channel_distribution.sample([number_of_blues, 2])),
          255 - tf.abs(channel_distribution.sample([number_of_blues, 1]))],
          axis=1),
      0, 255)

  # Assign each color a vector of 3 booleans based on its true label.
  labels = tf.concat([
      tf.tile(tf.constant([[True, False, False]]), (number_of_reds, 1)),
      tf.tile(tf.constant([[False, True, False]]), (number_of_greens, 1)),
      tf.tile(tf.constant([[False, False, True]]), (number_of_blues, 1))
  ], axis=0)

  # We introduce 3 normal distributions. They are used to predict whether a
  # color falls under a certain class (based on distances from corners of the
  # color triangle). The distributions vary per color. We have the distributions
  # narrow over time.
  iteration = tf.Variable(0.0)
  increment_iteration = tf.assign_add(iteration, 1.0)
  with tf.control_dependencies([increment_iteration]):
    red_predictor = tf.distributions.Normal(
        loc=0., scale=tf.constant(40.) - iteration)
    green_predictor = tf.distributions.Normal(
        loc=0., scale=tf.constant(60.) - iteration)
    blue_predictor = tf.distributions.Normal(
        loc=0., scale=tf.constant(100.) - iteration)

  # Make predictions (assign 3 probabilities to each color based on each color's
  # distance to each of the 3 corners).
  examples = tf.concat([true_reds, true_greens, true_blues], axis=0)
  probabilities_colors_are_red = red_predictor.cdf(
      tf.norm(examples - tf.constant([255., 0, 0]), axis=1))
  probabilities_colors_are_green = green_predictor.cdf(
      tf.norm(examples - tf.constant([0, 255., 0]), axis=1))
  probabilities_colors_are_blue = blue_predictor.cdf(
      tf.norm(examples - tf.constant([0, 0, 255.]), axis=1))
  predictions = tf.concat([
      tf.expand_dims(probabilities_colors_are_red, 1),
      tf.expand_dims(probabilities_colors_are_green, 1),
      tf.expand_dims(probabilities_colors_are_blue, 1)
    ], axis=1)

  if doubly_weigh_blues:
    weights = tf.concat([
      tf.ones((number_of_reds, 1)),
      tf.ones((number_of_greens, 1)),
      2 * tf.ones((number_of_blues, 1)),
    ], axis=0)
  else:
    weights = None

  # This is the crucial piece. We write data required for generating PR curves.
  summary.op(
      tag='colors',
      labels=labels,
      predictions=predictions,
      num_thresholds=50,
      num_classes=3,
      weights=weights)
  merged_summary_op = tf.summary.merge_all()
  events_directory = os.path.join(logdir, run_name)
  sess = tf.Session()
  writer = tf.summary.FileWriter(events_directory, sess.graph)

  # We run 10 steps.
  sess.run(tf.global_variables_initializer())
  for step in xrange(steps):
    writer.add_summary(sess.run(merged_summary_op), step)

  writer.close()


def run_all(logdir, steps, verbose=False):
  """Generate PR curve summaries.

  Arguments:
    logdir: The directory into which to store all the runs' data.
    steps: The number of steps to run for.
  """
  # First, we generate data for a PR curve that assigns even weights for
  # predictions of all classes.
  run_name = 'evenly_weighed'
  if verbose:
      print('--- Running: %s' % run_name)
  start_runs(
      logdir=logdir,
      steps=steps,
      run_name=run_name,
      doubly_weigh_blues=False)

  # Next, we generate data for a PR curve that assigns 2x the weight for
  # predictions of whether a color is blue.
  run_name = 'doubly_weigh_blues'
  if verbose:
      print('--- Running: %s' % run_name)
  start_runs(
      logdir=logdir,
      steps=steps,
      run_name='doubly_weigh_blues',
      doubly_weigh_blues=True)


def main(unused_argv):
  print('Saving output to %s.' % FLAGS.logdir)
  run_all(FLAGS.logdir, FLAGS.steps, verbose=True)
  print('Done. Output saved to %s.' % FLAGS.logdir)


if __name__ == '__main__':
  tf.app.run()
