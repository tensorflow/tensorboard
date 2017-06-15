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
"""Sample data exhibiting histogram summaries."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os.path

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

# Directory into which to write tensorboard data.
LOGDIR = '/tmp/histograms_demo'


def run(logdir):
  """Generate a bunch of histogram data, and write it to logdir."""
  k = tf.placeholder(tf.float32)

  # Make a normal distribution, with a shifting mean
  mean_moving_normal = tf.random_normal(shape=[1000], mean=(5*k), stddev=1)
  # Record that distribution into a histogram summary
  tf.summary.histogram("normal/moving_mean", mean_moving_normal)

  # Make a normal distribution with shrinking variance
  variance_shrinking_normal = tf.random_normal(shape=[1000], mean=0, stddev=1-(k))
  # Record that distribution too
  tf.summary.histogram("normal/shrinking_variance", variance_shrinking_normal)

  # Let's combine both of those distributions into one dataset
  normal_combined = tf.concat([mean_moving_normal, variance_shrinking_normal], 0)
  # We add another histogram summary to record the combined distribution
  tf.summary.histogram("normal/bimodal", normal_combined)

  # Add a gamma distribution
  gamma = tf.random_gamma(shape=[1000], alpha=k)
  tf.summary.histogram("gamma", gamma)

  # And a poisson distribution
  poisson = tf.random_poisson(shape=[1000], lam=k)
  tf.summary.histogram("poisson", poisson)

  # And a uniform distribution
  uniform = tf.random_uniform(shape=[1000], maxval=k*10)
  tf.summary.histogram("uniform", uniform)

  # Finally, combine everything together!
  all_distributions = [mean_moving_normal, variance_shrinking_normal,
                       gamma, poisson, uniform]
  all_combined = tf.concat(all_distributions, 0)
  tf.summary.histogram("all_combined", all_combined)

  summaries = tf.summary.merge_all()

  # Setup a session and summary writer
  sess = tf.Session()
  writer = tf.summary.FileWriter(logdir)

  # Setup a loop and write the summaries to disk
  N = 400
  for step in xrange(N):
    k_val = step/float(N)
    summ = sess.run(summaries, feed_dict={k: k_val})
    writer.add_summary(summ, global_step=step)


def main(unused_argv):
  print('Running histograms demo. Output saving to %s.' % LOGDIR)
  run(LOGDIR)
  print('Done. Output saved to %s.' % LOGDIR)


if __name__ == '__main__':
  tf.app.run()
