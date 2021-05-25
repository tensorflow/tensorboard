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
"""Demo code."""


from absl import app
import tensorflow as tf

from tensorboard_plugin_example import summary_v2


def main(unused_argv):
    writer = tf.summary.create_file_writer("demo_logs")
    with writer.as_default():
        summary_v2.greeting(
            "guestbook",
            "Alice",
            step=0,
            description="Sign your name!",
        )
        summary_v2.greeting(
            "guestbook", "Bob", step=1
        )  # no need for `description`
        summary_v2.greeting("guestbook", "Cheryl", step=2)
        summary_v2.greeting("more_names", "David", step=4)


if __name__ == "__main__":
    app.run(main)
