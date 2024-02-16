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

import contextlib
import os
import tensorflow as tf
import numpy as np

# Directory into which to write the data for tensorboard to read.
LOGDIR = "/tmp/graphs_demo"


@contextlib.contextmanager
def _nullcontext():
    """Pre-Python-3.7-compatible standin for contextlib.nullcontext."""
    yield


def _silence_deprecation_warnings():
    """Context manager that best-effort silences TF deprecation warnings."""
    try:
        # Learn this one weird trick to make TF deprecation warnings go away.
        from tensorflow.python.util import deprecation

        return deprecation.silence()
    except (ImportError, AttributeError):
        return _nullcontext()


def write_graph():
    """Demonstrate basic graph writing."""
    logdir = os.path.join(LOGDIR, "write_graph")

    @tf.function
    def f():
        x = tf.constant(2)
        y = tf.constant(3)
        return x**y

    with tf.summary.create_file_writer(logdir).as_default():
        if hasattr(tf.summary, "graph"):
            # Emit a simple graph.
            tf.summary.graph(f.get_concrete_function().graph)
        else:
            print(
                "Could not find tf.summary.graph(); use TF 2.5.0+ to run full demo"
            )


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
        optimizer=tf.keras.optimizers.SGD(learning_rate=0.2),
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
        return i + i

    @tf.function
    def g(i):
        return i * i

    with tf.summary.create_file_writer(logdir).as_default():
        for step in range(3):
            # Suppress the profiler deprecation warnings from tf.summary.trace_*.
            with _silence_deprecation_warnings():
                tf.summary.trace_on(profiler=True, profiler_outdir=logdir)
                print(f(tf.constant(step)).numpy())
                tf.summary.trace_export("prof_f", step=step)

                tf.summary.trace_on(profiler=False)
                print(g(tf.constant(step)).numpy())
                tf.summary.trace_export("prof_g", step=step)


def main():
    # Create three demo graphs.
    write_graph()
    profile()
    keras()

    print(
        "To view results of all graphs in your browser, run `tensorboard --logdir %s`"
        % LOGDIR
    )


if __name__ == "__main__":
    main()
