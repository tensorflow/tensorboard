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
"""Write TensorBoard scalar summary data.

This short example illustrates how to use the scalar writing in eager
mode TensorFlow 2.
"""

import os
import random

from absl import app
from absl import flags
from absl import logging
import tensorflow as tf

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "logdir", "/tmp/scalars_logdir", "Where to write the output logdir."
)
flags.DEFINE_integer("num_runs", 1, "How many runs to create.")
flags.DEFINE_integer(
    "num_tags_per_run",
    1,
    "How many tags (named scalar plots) to create per run.",
)
flags.DEFINE_integer(
    "num_scalars_per_tag", 1, "How many scalar values to write per tag."
)

tf.compat.v1.enable_eager_execution()


def main(unused_argv):
    logdir = FLAGS.logdir
    logging.info("Saving output to %s.", logdir)
    for i_run in range(0, FLAGS.num_runs):
        run_name = "test-run-name-%.8d" % i_run
        writer = tf.summary.create_file_writer(os.path.join(logdir, run_name))
        with writer.as_default():
            for i_tag in range(0, FLAGS.num_tags_per_run):
                tag_name = "cool tag %.8d" % i_tag
                for i_scalar in range(0, FLAGS.num_scalars_per_tag):
                    tf.summary.scalar(tag_name, random.random(), step=i_scalar)
    logging.info(
        "Created %d runs, each with %d tags, and %d scalar values in each tag"
        % (FLAGS.num_runs, FLAGS.num_tags_per_run, FLAGS.num_scalars_per_tag)
    )
    logging.info("Output saved to %s." % logdir)
    logging.info(
        """
You can now view the scalars in this logdir:

Run local:

    tensorboard --logdir=%s

Upload to TensorBoard.dev:

    tensorboard dev upload \\
      --logdir=%s \\
      --name=\"Scalars demo.\" \\
      --one_shot
""",
        logdir,
        logdir,
    )


if __name__ == "__main__":
    app.run(main)
