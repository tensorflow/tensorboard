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
"""Sample data for the graph plugin.

Most demos emit basic run graph data, but the graph plugin also shows
more specialized data types. See function docstrings for details about
what runs have what data.
"""

import os

import tensorflow as tf
import numpy as np

LOGDIR = "/tmp/graphs_demo"


def main():
    tagged()
    profile()
    keras()


def tagged():
    """Create run graph data with `TaggedRunMetadata`.

    The `tagged` run has a top-level run graph as well as steps
    `step_0000` through `step_0002`, each with profile data.
    """
    logdir = os.path.join(LOGDIR, "tagged")
    with tf.compat.v1.Graph().as_default():
        with tf.compat.v1.Session() as sess:
            step_tensor = tf.compat.v1.placeholder(shape=(), dtype=tf.int32)
            output = step_tensor * 2

            writer = tf.compat.v1.summary.FileWriter(logdir)
            with writer:
                writer.add_graph(sess.graph)
                for step in range(3):
                    feed_dict = {step_tensor: step}
                    run_options = tf.compat.v1.RunOptions()
                    run_options.trace_level = tf.compat.v1.RunOptions.FULL_TRACE
                    run_metadata = tf.compat.v1.RunMetadata()
                    s = sess.run(
                        output,
                        feed_dict=feed_dict,
                        options=run_options,
                        run_metadata=run_metadata,
                    )
                    writer.add_run_metadata(run_metadata, "step_%04d" % step)


def keras():
    """Create a Keras conceptual graph and op graphs.

    The `keras/train` run has a run-level graph, a `batch_2` tag with op
    graph only (`graph_run_metadata_graph` plugin), and a `keras` tag
    with a Keras conceptual graph only (`graph_keras_model` plugin).
    """
    logdir = os.path.join(LOGDIR, "keras")

    data_size = 1000
    train_fac = 0.8
    train_size = int(data_size * train_fac)
    x = np.linspace(-1, 1, data_size)
    np.random.shuffle(x)
    y = 0.5 * x + 2 + np.random.normal(0, 0.05, (data_size,))
    (x_train, y_train) = x[:train_size], y[:train_size]
    (x_test, y_test) = x[train_size:], y[train_size:]

    layers = [
        tf.keras.layers.Dense(16, input_dim=1),
        tf.keras.layers.Dense(1),
    ]
    model = tf.keras.models.Sequential(layers)
    model.compile(
        loss=tf.keras.losses.mean_squared_error,
        optimizer=tf.keras.optimizers.SGD(lr=0.2),
    )
    model.fit(
        x_train,
        y_train,
        batch_size=train_size,
        verbose=0,
        epochs=100,
        validation_data=(x_test, y_test),
        callbacks=[tf.keras.callbacks.TensorBoard(logdir)],
    )


def profile():
    """Create data with op graphs and profile data.

    The `profile` run has tags `prof_f` with both profile and op graph data
    (`graph_run_metadata` plugin), and `prof_g` with profile data only
    (`graph_run_metadata_graph` plugin).
    """

    logdir = os.path.join(LOGDIR, "profile")

    @tf.function
    def f(i):
        return tf.constant(i) + tf.constant(i)

    @tf.function
    def g(i):
        return tf.constant(i) * tf.constant(i)

    with tf.summary.create_file_writer(logdir).as_default():
        for step in range(3):
            tf.summary.trace_on(profiler=True)
            print(f(step).numpy())
            tf.summary.trace_export("prof_f", step=step, profiler_outdir=logdir)

            tf.summary.trace_on(profiler=False)
            print(g(step).numpy())
            tf.summary.trace_export("prof_g", step=step)


if __name__ == "__main__":
    main()
