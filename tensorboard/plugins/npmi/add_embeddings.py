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
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
import os
import numpy as np
import tensorflow as tf
from absl import app
from absl import flags
from tensorboard.plugins.npmi import summary
from tensorboard.plugins.npmi import metadata

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "log_path", "", "Log file to extend by embedding data.",
)
flags.DEFINE_string(
    "out_path", "", "Where to write the new log file.",
)
flags.DEFINE_string(
    "embeddings_path", "", "Where to write the new log file.",
)


def add_embeddings(log_path, out_path, embeddings_path):
    with open(embeddings_path, "rb") as f:
        embeddings = np.load(f)
    event_file = log_path
    embeddings_tensor = tf.convert_to_tensor(embeddings)
    writer = tf.compat.v2.summary.create_file_writer(out_path)
    with writer.as_default():
        summary.npmi_embeddings(embeddings_tensor, 1)
        for summ in tf.compat.v1.train.summary_iterator(event_file):
            for value in summ.summary.value:
                parsed = tf.make_ndarray(value.tensor)
                tensor_result = tf.convert_to_tensor(parsed)
                if value.tag == metadata.ANNOTATIONS_TAG:
                    summary.npmi_annotations(tensor_result, 1)
                elif value.tag == metadata.VALUES_TAG:
                    summary.npmi_values(tensor_result, 1)
                elif value.tag == metadata.METRICS_TAG:
                    summary.npmi_metrics(tensor_result, 1)
    writer.close()


def main(unused_argv):
    add_embeddings(FLAGS.log_path, FLAGS.out_path, FLAGS.embeddings_path)


if __name__ == "__main__":
    app.run(main)
