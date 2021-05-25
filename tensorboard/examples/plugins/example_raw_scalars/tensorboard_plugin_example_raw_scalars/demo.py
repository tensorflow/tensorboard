# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Demo code.

This generates summary logs viewable by the raw scalars example plugin.
After installing the plugin (`python setup.py develop`), you can run TensorBoard
with logdir set to the `demo_logs` directory.
"""


import math

from absl import app
import tensorflow as tf


def main(unused_argv):
    writer = tf.summary.create_file_writer("demo_logs")
    with writer.as_default():
        for i in range(100):
            tf.summary.scalar("custom_tag", 100 * math.sin(i), step=i)


if __name__ == "__main__":
    app.run(main)
