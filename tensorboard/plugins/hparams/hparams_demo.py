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
"""Write sample summary data for the hparams plugin.

See also `hparams_minimal_demo.py` in this directory for a demo that
runs much faster, using synthetic data instead of actually training
MNIST models.
"""


import os.path
import random
import shutil

from absl import app
from absl import flags
import numpy as np
import tensorflow as tf

from tensorboard.plugins.hparams import api as hp


if int(tf.__version__.split(".")[0]) < 2:
    # The tag names emitted for Keras metrics changed from "acc" (in 1.x)
    # to "accuracy" (in 2.x), so this demo does not work properly in
    # TensorFlow 1.x (even with `tf.enable_eager_execution()`).
    raise ImportError("TensorFlow 2.x is required to run this demo.")


flags.DEFINE_integer(
    "num_session_groups",
    30,
    "The approximate number of session groups to create.",
)
flags.DEFINE_string(
    "logdir",
    "/tmp/hparams_demo",
    "The directory to write the summary information to.",
)
flags.DEFINE_integer(
    "summary_freq",
    600,
    "Summaries will be written every n steps, where n is the value of "
    "this flag.",
)
flags.DEFINE_integer(
    "num_epochs",
    5,
    "Number of epochs per trial.",
)


# We'll use MNIST for this example.
DATASET = tf.keras.datasets.mnist
INPUT_SHAPE = (28, 28)
OUTPUT_CLASSES = 10

HP_CONV_LAYERS = hp.HParam("conv_layers", hp.IntInterval(1, 3))
HP_CONV_KERNEL_SIZE = hp.HParam("conv_kernel_size", hp.Discrete([3, 5]))
HP_DENSE_LAYERS = hp.HParam("dense_layers", hp.IntInterval(1, 3))
HP_DROPOUT = hp.HParam("dropout", hp.RealInterval(0.1, 0.4))
HP_OPTIMIZER = hp.HParam("optimizer", hp.Discrete(["adam", "adagrad"]))

HPARAMS = [
    HP_CONV_LAYERS,
    HP_CONV_KERNEL_SIZE,
    HP_DENSE_LAYERS,
    HP_DROPOUT,
    HP_OPTIMIZER,
]

METRICS = [
    hp.Metric(
        "epoch_accuracy",
        group="validation",
        display_name="accuracy (val.)",
    ),
    hp.Metric(
        "epoch_loss",
        group="validation",
        display_name="loss (val.)",
    ),
    hp.Metric(
        "batch_accuracy",
        group="train",
        display_name="accuracy (train)",
    ),
    hp.Metric(
        "batch_loss",
        group="train",
        display_name="loss (train)",
    ),
]


def model_fn(hparams, seed):
    """Create a Keras model with the given hyperparameters.

    Args:
      hparams: A dict mapping hyperparameters in `HPARAMS` to values.
      seed: A hashable object to be used as a random seed (e.g., to
        construct dropout layers in the model).

    Returns:
      A compiled Keras model.
    """
    rng = random.Random(seed)

    model = tf.keras.models.Sequential()
    model.add(tf.keras.layers.Input(INPUT_SHAPE))
    model.add(tf.keras.layers.Reshape(INPUT_SHAPE + (1,)))  # grayscale channel

    # Add convolutional layers.
    conv_filters = 8
    for _ in range(hparams[HP_CONV_LAYERS]):
        model.add(
            tf.keras.layers.Conv2D(
                filters=conv_filters,
                kernel_size=hparams[HP_CONV_KERNEL_SIZE],
                padding="same",
                activation="relu",
            )
        )
        model.add(tf.keras.layers.MaxPool2D(pool_size=2, padding="same"))
        conv_filters *= 2

    model.add(tf.keras.layers.Flatten())
    model.add(
        tf.keras.layers.Dropout(
            hparams[HP_DROPOUT], seed=rng.randrange(1 << 32)
        )
    )

    # Add fully connected layers.
    dense_neurons = 32
    for _ in range(hparams[HP_DENSE_LAYERS]):
        model.add(tf.keras.layers.Dense(dense_neurons, activation="relu"))
        dense_neurons *= 2

    # Add the final output layer.
    model.add(tf.keras.layers.Dense(OUTPUT_CLASSES, activation="softmax"))

    model.compile(
        loss="sparse_categorical_crossentropy",
        optimizer=hparams[HP_OPTIMIZER],
        metrics=["accuracy"],
    )
    return model


def run(data, base_logdir, session_id, hparams):
    """Run a training/validation session.

    Flags must have been parsed for this function to behave.

    Args:
      data: The data as loaded by `prepare_data()`.
      base_logdir: The top-level logdir to which to write summary data.
      session_id: A unique string ID for this session.
      hparams: A dict mapping hyperparameters in `HPARAMS` to values.
    """
    model = model_fn(hparams=hparams, seed=session_id)
    logdir = os.path.join(base_logdir, session_id)

    callback = tf.keras.callbacks.TensorBoard(
        logdir,
        update_freq=flags.FLAGS.summary_freq,
        profile_batch=0,  # workaround for issue #2084
    )
    hparams_callback = hp.KerasCallback(logdir, hparams)
    ((x_train, y_train), (x_test, y_test)) = data
    result = model.fit(
        x=x_train,
        y=y_train,
        epochs=flags.FLAGS.num_epochs,
        shuffle=False,
        validation_data=(x_test, y_test),
        callbacks=[callback, hparams_callback],
    )


def prepare_data():
    """Load and normalize data."""
    ((x_train, y_train), (x_test, y_test)) = DATASET.load_data()
    x_train = x_train.astype("float32")
    x_test = x_test.astype("float32")
    x_train /= 255.0
    x_test /= 255.0
    return ((x_train, y_train), (x_test, y_test))


def run_all(logdir, verbose=False):
    """Perform random search over the hyperparameter space.

    Arguments:
      logdir: The top-level directory into which to write data. This
        directory should be empty or nonexistent.
      verbose: If true, print out each run's name as it begins.
    """
    data = prepare_data()
    rng = random.Random(0)

    with tf.summary.create_file_writer(logdir).as_default():
        hp.hparams_config(hparams=HPARAMS, metrics=METRICS)

    sessions_per_group = 2
    num_sessions = flags.FLAGS.num_session_groups * sessions_per_group
    session_index = 0  # across all session groups
    for group_index in range(flags.FLAGS.num_session_groups):
        hparams = {h: h.domain.sample_uniform(rng) for h in HPARAMS}
        hparams_string = str(hparams)
        for repeat_index in range(sessions_per_group):
            session_id = str(session_index)
            session_index += 1
            if verbose:
                print(
                    "--- Running training session %d/%d"
                    % (session_index, num_sessions)
                )
                print(hparams_string)
                print("--- repeat #: %d" % (repeat_index + 1))
            run(
                data=data,
                base_logdir=logdir,
                session_id=session_id,
                hparams=hparams,
            )


def main(unused_argv):
    np.random.seed(0)
    logdir = flags.FLAGS.logdir
    shutil.rmtree(logdir, ignore_errors=True)
    print("Saving output to %s." % logdir)
    run_all(logdir=logdir, verbose=True)
    print("Done. Output saved to %s." % logdir)


if __name__ == "__main__":
    app.run(main)
