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
"""Create sample custom scalar summary data."""

from absl import app
import tensorflow as tf

from tensorboard.plugins.custom_scalar import summary as cs_summary
from tensorboard.plugins.custom_scalar import layout_pb2


LOGDIR = "/tmp/custom_scalar_demo"


def run(logdir):
    """Run custom scalar demo and generate event files."""
    tf.random.set_seed(0)
    writer = tf.summary.create_file_writer(logdir)
    with writer.as_default():
        for step in range(42):
            write_scalars(step)
        # We only need to specify the layout once (instead of per step).
        tf.summary.experimental.write_raw_pb(
            create_layout_summary().SerializeToString(), step=0
        )


def write_scalars(step):
    x = tf.cast(step, dtype=tf.float32)
    with tf.name_scope("loss"):
        # Specify 2 different loss values, each tagged differently.
        tf.summary.scalar("foo", tf.pow(0.9, x), step=step)
        tf.summary.scalar("bar", tf.pow(0.85, x + 2), step=step)

        # Log metric baz as well as upper and lower bounds for a margin chart.
        middle_baz_value = x + 4 * tf.random.uniform([]) - 2
        tf.summary.scalar("baz", middle_baz_value, step=step)
        tf.summary.scalar(
            "baz_lower",
            middle_baz_value - 6.42 - tf.random.uniform([]),
            step=step,
        )
        tf.summary.scalar(
            "baz_upper",
            middle_baz_value + 6.42 + tf.random.uniform([]),
            step=step,
        )
    with tf.name_scope("trigFunctions"):
        tf.summary.scalar("cosine", tf.cos(x), step=step)
        tf.summary.scalar("sine", tf.sin(x), step=step)
        tf.summary.scalar("tangent", tf.tan(x), step=step)


def create_layout_summary():
    return cs_summary.pb(
        layout_pb2.Layout(
            category=[
                layout_pb2.Category(
                    title="losses",
                    chart=[
                        layout_pb2.Chart(
                            title="losses",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"loss(?!.*margin.*)"],
                            ),
                        ),
                        layout_pb2.Chart(
                            title="baz",
                            margin=layout_pb2.MarginChartContent(
                                series=[
                                    layout_pb2.MarginChartContent.Series(
                                        value="loss/baz",
                                        lower="loss/baz_lower",
                                        upper="loss/baz_upper",
                                    ),
                                ],
                            ),
                        ),
                    ],
                ),
                layout_pb2.Category(
                    title="trig functions",
                    chart=[
                        layout_pb2.Chart(
                            title="wave trig functions",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[
                                    r"trigFunctions/cosine",
                                    r"trigFunctions/sine",
                                ],
                            ),
                        ),
                        # The range of tangent is different. Give it its own chart.
                        layout_pb2.Chart(
                            title="tan",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"trigFunctions/tangent"],
                            ),
                        ),
                    ],
                    # This category we care less about. Make it initially closed.
                    closed=True,
                ),
            ]
        )
    )


def main(unused_argv):
    print("Saving output to %s." % LOGDIR)
    run(LOGDIR)
    print("Done. Output saved to %s." % LOGDIR)


if __name__ == "__main__":
    app.run(main)
