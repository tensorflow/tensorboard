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

import os
import tensorflow as tf  # Requires Tensorflow >=2.1
from tensorboard.plugins import projector
import tensorflow_datasets as tfds

# This demo expands upon the word embeddings tutorial found
# here: https://www.tensorflow.org/tutorials/text/word_embeddings)
# and is intended to demonstrate the use of the embedding projector.

LOG_DIR = "/tmp/projector_demo"  # Tensorboard log dir
METADATA_FNAME = "meta.tsv"  # Labels will be stored here
STEP = 0

# Load imdb reviews dataset
(train_data, test_data), info = tfds.load(
    "imdb_reviews/subwords8k",
    split=(tfds.Split.TRAIN, tfds.Split.TEST),
    with_info=True,
    as_supervised=True,
)
encoder = info.features["text"].encoder

# shuffle, pad, and train the data.
train_batches = train_data.shuffle(1000).padded_batch(
    10, padded_shapes=((None,), ())
)
test_batches = test_data.shuffle(1000).padded_batch(
    10, padded_shapes=((None,), ())
)
train_batch, train_labels = next(iter(train_batches))
embedding_dim = 16

# Create a basic embedding layer
embedding = tf.keras.layers.Embedding(encoder.vocab_size, embedding_dim)
model = tf.keras.Sequential(
    [
        embedding,
        tf.keras.layers.GlobalAveragePooling1D(),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1),
    ]
)

# Compile model
model.compile(
    optimizer="adam",
    loss=tf.keras.losses.BinaryCrossentropy(from_logits=True),
    metrics=["accuracy"],
)

# Train model
history = model.fit(
    train_batches, epochs=1, validation_data=test_batches, validation_steps=20
)

# Fetch the embedding layer and get the weights.
# Make sure to remove the first element, as it is padding.
weights = tf.Variable(model.layers[0].get_weights()[0][1:])


def register_embedding(weights, labels, log_dir) -> None:
    """Saves a metadata file (labels) and a checkpoint (derived from weights)
    and configures the Embedding Projector to read from the appropriate locations.
    Args:
      weights: tf.Variable with the weights of the embedding layer to be displayed.
      labels: list of labels corresponding to the weights.
      logdir: Directory into which to store the config file, as a `str`.
    """

    # Create a checkpoint from embedding, the filename and key are
    # name of the tensor.
    checkpoint = tf.train.Checkpoint(embedding=weights)
    checkpoint.save(os.path.join(LOG_DIR, "embedding.ckpt"))

    # Save Labels separately on a line-by-line manner.
    with open(os.path.join(log_dir, METADATA_FNAME), "w") as f:
        for label in labels:
            f.write("{}\n".format(label))

    # Set up config
    config = projector.ProjectorConfig()
    embedding = config.embeddings.add()
    # The name of the tensor will be suffixed by `/.ATTRIBUTES/VARIABLE_VALUE`
    embedding.tensor_name = "embedding/.ATTRIBUTES/VARIABLE_VALUE"
    embedding.metadata_path = METADATA_FNAME
    projector.visualize_embeddings(log_dir, config)


# Save Files
register_embedding(weights, encoder.subwords, LOG_DIR)
