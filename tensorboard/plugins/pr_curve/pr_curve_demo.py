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

Using 3 other normal distributions (over the distance each color is from a
corner of the color triangle - RGB), we then compute the probability that each
color belongs to the class. We use those probabilities to generate PR curves.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os.path

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.plugins.pr_curve import summary

FLAGS = tf.flags.FLAGS

tf.flags.DEFINE_string('logdir', '/tmp/pr_curve_demo',
                       'Directory into which to write TensorBoard data.')

tf.flags.DEFINE_integer('steps', 10,
                        'Number of steps to generate for each PR curve.')

def start_runs(
    logdir,
    steps,
    run_name,
    thresholds,
    mask_every_other_prediction=False):
  """Generate a PR curve with precision and recall evenly weighted.

  Arguments:
    logdir: The directory into which to store all the runs' data.
    steps: The number of steps to run for.
    run_name: The name of the run.
    thresholds: The number of thresholds to use for PR curves.
    mask_every_other_prediction: Whether to mask every other prediction by
      alternating weights between 0 and 1.
  """
  tf.reset_default_graph()
  tf.set_random_seed(42)

  # Create a normal distribution layer used to generate true color labels.
  distribution = tf.distributions.Normal(loc=0., scale=142.)

  # Sample the distribution to generate colors. Lets generate different numbers
  # of each color. The first dimension is the count of examples.

  # The calls to sample() are given fixed random seed values that are "magic"
  # in that they correspond to the default seeds for those ops when the PR
  # curve test (which depends on this code) was written. We've pinned these
  # instead of continuing to use the defaults since the defaults are based on
  # node IDs from the sequence of nodes added to the graph, which can silently
  # change when this code or any TF op implementations it uses are modified.

  # TODO(nickfelt): redo the PR curve test to avoid reliance on random seeds.

  # Generate reds.
  number_of_reds = 100
  true_reds = tf.clip_by_value(
      tf.concat([
          255 - tf.abs(distribution.sample([number_of_reds, 1], seed=11)),
          tf.abs(distribution.sample([number_of_reds, 2], seed=34))
      ], axis=1),
      0, 255)

  # Generate greens.
  number_of_greens = 200
  true_greens = tf.clip_by_value(
      tf.concat([
          tf.abs(distribution.sample([number_of_greens, 1], seed=61)),
          255 - tf.abs(distribution.sample([number_of_greens, 1], seed=82)),
          tf.abs(distribution.sample([number_of_greens, 1], seed=105))
      ], axis=1),
      0, 255)

  # Generate blues.
  number_of_blues = 150
  true_blues = tf.clip_by_value(
      tf.concat([
          tf.abs(distribution.sample([number_of_blues, 2], seed=132)),
          255 - tf.abs(distribution.sample([number_of_blues, 1], seed=153))
      ], axis=1),
      0, 255)

  # Assign each color a vector of 3 booleans based on its true label.
  labels = tf.concat([
      tf.tile(tf.constant([[True, False, False]]), (number_of_reds, 1)),
      tf.tile(tf.constant([[False, True, False]]), (number_of_greens, 1)),
      tf.tile(tf.constant([[False, False, True]]), (number_of_blues, 1)),
  ], axis=0)

  # We introduce 3 normal distributions. They are used to predict whether a
  # color falls under a certain class (based on distances from corners of the
  # color triangle). The distributions vary per color. We have the distributions
  # narrow over time.
  initial_standard_deviations = [v + FLAGS.steps for v in (158, 200, 242)]
  iteration = tf.placeholder(tf.int32, shape=[])
  red_predictor = tf.distributions.Normal(
      loc=0.,
      scale=tf.cast(
          initial_standard_deviations[0] - iteration,
          dtype=tf.float32))
  green_predictor = tf.distributions.Normal(
      loc=0.,
      scale=tf.cast(
          initial_standard_deviations[1] - iteration,
          dtype=tf.float32))
  blue_predictor = tf.distributions.Normal(
      loc=0.,
      scale=tf.cast(
          initial_standard_deviations[2] - iteration,
          dtype=tf.float32))

  # Make predictions (assign 3 probabilities to each color based on each color's
  # distance to each of the 3 corners). We seek double the area in the right
  # tail of the normal distribution.
  examples = tf.concat([true_reds, true_greens, true_blues], axis=0)
  probabilities_colors_are_red = (1 - red_predictor.cdf(
      tf.norm(examples - tf.constant([255., 0, 0]), axis=1))) * 2
  probabilities_colors_are_green = (1 - green_predictor.cdf(
      tf.norm(examples - tf.constant([0, 255., 0]), axis=1))) * 2
  probabilities_colors_are_blue = (1 - blue_predictor.cdf(
      tf.norm(examples - tf.constant([0, 0, 255.]), axis=1))) * 2

  predictions = (
      probabilities_colors_are_red,
      probabilities_colors_are_green,
      probabilities_colors_are_blue
  )

  # This is the crucial piece. We write data required for generating PR curves.
  # We create 1 summary per class because we create 1 PR curve per class.
  for i, color in enumerate(('red', 'green', 'blue')):
    description = ('The probabilities used to create this PR curve are '
                   'generated from a normal distribution. Its standard '
                   'deviation is initially %0.0f and decreases over time.' %
                   initial_standard_deviations[i])

    weights = None
    if mask_every_other_prediction:
      # Assign a weight of 0 to every even-indexed prediction. Odd-indexed
      # predictions are assigned a default weight of 1.
      consecutive_indices = tf.reshape(
          tf.range(tf.size(predictions[i])), tf.shape(predictions[i]))
      weights = tf.cast(consecutive_indices % 2, dtype=tf.float32)

    summary.op(
        name=color,
        labels=labels[:, i],
        predictions=predictions[i],
        num_thresholds=thresholds,
        weights=weights,
        display_name='classifying %s' % color,
        description=description)
  merged_summary_op = tf.summary.merge_all()
  events_directory = os.path.join(logdir, run_name)
  sess = tf.Session()
  writer = tf.summary.FileWriter(events_directory, sess.graph)

  for step in xrange(steps):
    feed_dict = {
        iteration: step,
    }
    merged_summary = sess.run(merged_summary_op, feed_dict=feed_dict)
    writer.add_summary(merged_summary, step)

  writer.close()

def run_all(logdir, steps, thresholds, verbose=False):
  """Generate PR curve summaries.

  Arguments:
    logdir: The directory into which to store all the runs' data.
    steps: The number of steps to run for.
    verbose: Whether to print the names of runs into stdout during execution.
    thresholds: The number of thresholds to use for PR curves.
  """
  # First, we generate data for a PR curve that assigns even weights for
  # predictions of all classes.
  run_name = 'colors'
  if verbose:
    print('--- Running: %s' % run_name)
  start_runs(
      logdir=logdir,
      steps=steps,
      run_name=run_name,
      thresholds=thresholds)

  # Next, we generate data for a PR curve that assigns arbitrary weights to
  # predictions.
  run_name = 'mask_every_other_prediction'
  if verbose:
    print('--- Running: %s' % run_name)
  start_runs(
      logdir=logdir,
      steps=steps,
      run_name=run_name,
      thresholds=thresholds,
      mask_every_other_prediction=True)

def main(unused_argv):
  print('Saving output to %s.' % FLAGS.logdir)
  run_all(FLAGS.logdir, FLAGS.steps, 50, verbose=True)
  print('Done. Output saved to %s.' % FLAGS.logdir)


if __name__ == '__main__':
  tf.app.run()
