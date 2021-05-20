# -*- coding: utf-8 -*-
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
"""Adds embedding representations to the annotations of a dataset to enable
similarity-based analysis.

To use this, provide a .npy file containing embeddings, which will be converted
to a logfile alongside other logs for this run.
"""

import numpy as np
import tensorflow as tf
from absl import app
from absl import flags
from tensorboard.plugins.npmi import summary

FLAGS = flags.FLAGS
flags.DEFINE_string(
    "out_path",
    None,
    "Directory to write the new log file to.",
)
flags.DEFINE_string(
    "embeddings_path",
    None,
    "Path to the numpy .npy file containing the embeddings. Embeddings have to "
    + "be shaped like (num_annotations, embedding_dimension) and have dtype  "
    + "float",
)
flags.mark_flag_as_required("out_path")
flags.mark_flag_as_required("embeddings_path")


def convert_embeddings(out_path, embeddings_path):
    with open(embeddings_path, "rb") as f:
        embeddings = np.load(f)
    embeddings_tensor = tf.convert_to_tensor(embeddings)
    writer = tf.summary.create_file_writer(out_path)
    with writer.as_default():
        summary.npmi_embeddings(embeddings_tensor, 1)
    writer.close()


def main(unused_argv):
    convert_embeddings(FLAGS.out_path, FLAGS.embeddings_path)


if __name__ == "__main__":
    app.run(main)
