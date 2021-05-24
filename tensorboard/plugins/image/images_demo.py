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
"""Sample image summaries inspired by the Images Tutorial..

See full tutorial at: https://www.tensorflow.org/tensorboard/image_summaries
"""


from absl import app
from absl import logging

import tensorflow as tf


# Directory into which to write tensorboard data.
LOGDIR = "/tmp/images_demo"


def run_all(logdir):
    w = tf.summary.create_file_writer(logdir)
    tf.random.set_seed(0)
    with w.as_default():
        for x in range(5):
            image1 = tf.random.uniform(shape=[8, 8, 1])
            image2 = tf.random.uniform(shape=[8, 8, 1])
            tf.summary.image("grayscale_noise", [image1, image2], step=x)
            # Convert the original dtype=int32 `Tensor` into `dtype=float64`.
            rgb_image_float = (
                tf.constant(
                    [
                        [[1000 - 100 * x, 0, 0], [0, 500, 1000 - 100 * x]],
                    ]
                )
                / 1000
            )
            tf.summary.image("picture", [rgb_image_float], step=x)


def main(unused_argv):
    logging.set_verbosity(logging.INFO)
    logging.info("Saving output to %s." % LOGDIR)
    run_all(LOGDIR)
    logging.info("Done. Output saved to %s." % LOGDIR)


if __name__ == "__main__":
    app.run(main)
