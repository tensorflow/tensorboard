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
"""Sample data exhibiting npmi values."""


import os

from absl import app
import tensorflow as tf
import numpy as np
from tensorboard.plugins.npmi import summary
from tensorboard.plugins.npmi import npmi_demo_data

# Directory into which to write tensorboard data.
LOGDIR = "/tmp/npmi_demo"


def setup_run(logdir, run_name):
    # Getting a list of dummy annotations from a separate file.
    python_annotations = npmi_demo_data.MOUNTAINS
    # Writing out random nPMI values.
    python_classes = ["nPMI@SKIABLE", "nPMI@NOT_SKIABLE"]
    python_result = np.random.rand(len(python_annotations), len(python_classes))
    python_result = python_result * 2.0 - 1.0
    logdir = os.path.join(logdir, run_name)
    os.makedirs(logdir)
    writer = tf.summary.create_file_writer(logdir)
    with writer.as_default():
        tensor_result = tf.convert_to_tensor(python_result)
        tensor_annotations = tf.convert_to_tensor(python_annotations)
        tensor_metrics = tf.convert_to_tensor(python_classes)

        summary.npmi_values(tensor_result, 1)
        summary.npmi_annotations(tensor_annotations, 1)
        summary.npmi_metrics(tensor_metrics, 1)

    writer.close()


def setup_all(logdir, verbose=False):
    for run in ["run_1", "run_2"]:
        if verbose:
            print("--- Setting up Run: %s" % run)
        setup_run(logdir, run)


def main(unused_argv):
    print("Saving output to %s." % LOGDIR)
    print(
        "To view results in your browser, run `tensorboard --logdir %s`"
        % LOGDIR
    )
    setup_all(LOGDIR, verbose=True)
    print("Done. Output saved to %s." % LOGDIR)


if __name__ == "__main__":
    app.run(main)
