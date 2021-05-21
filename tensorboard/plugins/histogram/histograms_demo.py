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
"""Sample data exhibiting histogram summaries."""


from absl import app
import tensorflow as tf

# Directory into which to write tensorboard data.
LOGDIR = "/tmp/histograms_demo"


def run_all(logdir, verbose=False, num_summaries=400):
    """Generate a bunch of histogram data, and write it to logdir."""
    del verbose

    tf.random.set_seed(0)

    k = tf.compat.v1.placeholder(tf.float32)

    # Make a normal distribution, with a shifting mean
    mean_moving_normal = tf.random.normal(shape=[1000], mean=(5 * k), stddev=1)
    # Record that distribution into a histogram summary
    tf.summary.histogram(
        "normal/moving_mean",
        mean_moving_normal,
        description="A normal distribution whose mean changes " "over time.",
    )

    # Make a normal distribution with shrinking variance
    shrinking_normal = tf.random.normal(shape=[1000], mean=0, stddev=1 - (k))
    # Record that distribution too
    tf.summary.histogram(
        "normal/shrinking_variance",
        shrinking_normal,
        description="A normal distribution whose variance "
        "shrinks over time.",
    )

    # Let's combine both of those distributions into one dataset
    normal_combined = tf.concat([mean_moving_normal, shrinking_normal], 0)
    # We add another histogram summary to record the combined distribution
    tf.summary.histogram(
        "normal/bimodal",
        normal_combined,
        description="A combination of two normal distributions, "
        "one with a moving mean and one with  "
        "shrinking variance. The result is a "
        "distribution that starts as unimodal and "
        "becomes more and more bimodal over time.",
    )

    # Add a gamma distribution
    gamma = tf.random.gamma(shape=[1000], alpha=k)
    tf.summary.histogram(
        "gamma",
        gamma,
        description="A gamma distribution whose shape "
        "parameter, α, changes over time.",
    )

    # And a poisson distribution
    poisson = tf.compat.v1.random_poisson(shape=[1000], lam=k)
    tf.summary.histogram(
        "poisson",
        poisson,
        description="A Poisson distribution, which only "
        "takes on integer values.",
    )

    # And a uniform distribution
    uniform = tf.random.uniform(shape=[1000], maxval=k * 10)
    tf.summary.histogram(
        "uniform", uniform, description="A simple uniform distribution."
    )

    # Finally, combine everything together!
    all_distributions = [
        mean_moving_normal,
        shrinking_normal,
        gamma,
        poisson,
        uniform,
    ]
    all_combined = tf.concat(all_distributions, 0)
    tf.summary.histogram(
        "all_combined",
        all_combined,
        description="An amalgamation of five distributions: a "
        "uniform distribution, a gamma "
        "distribution, a Poisson distribution, and "
        "two normal distributions.",
    )


def main(unused_argv):
    print("Running histograms demo. Output saving to %s." % LOGDIR)
    run_all(LOGDIR)
    print("Done. Output saved to %s." % LOGDIR)


if __name__ == "__main__":
    app.run(main)
