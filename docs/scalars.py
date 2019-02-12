from __future__ import absolute_import, division, print_function

import tensorflow as tf
from tensorflow import keras
from time import time

import random

# TODO(maniv): Remove this once tensorflow contains the v2 summary API.
from tensorflow.python.ops import summary_ops_v2 as tf_summary
import tensorboard.summary.v2 as summary

# TODO(maniv): Remove this once this script has been validated.
print(tf.__version__)

def my_function(x):
  """Returns a 3-dimensional vector as a function of x, a one-dimensional input."""
  return [5 * x, 6 * x + 10, 7 * (x - 1) + 100]


def generate_data():
  """Generator that returns the pair (x, y), such that y = my_function(x), i.e.,
  x is randomly generated 1-dimensional input data and y is the value returned by my_function(x)."""
  # Initialize seed.
  random.seed(None)
  while True:
    x = random.random()
    y = my_function(x)
    yield (x, y)


def create_dataset():
  """Returns a dataset that provides an infinite supply of data of the form (x, y), where
  y = my_function(x)."""
  dataset = tf.data.Dataset.from_generator(
      generate_data,
      (tf.float32, tf.float32),
      (tf.TensorShape([]), tf.TensorShape([3])),
  )
  return dataset.batch(20)

# Now, let's begin actual ML!

ds = create_dataset()

model = keras.models.Sequential([
    keras.layers.Dense(8, input_dim=1, activation='sigmoid'),
    keras.layers.Dense(3, activation='linear')
])

model.compile(
    loss="mean_absolute_percentage_error",
    optimizer=keras.optimizers.Adam(lr=0.001),
)

# Set up TensorBoard.
tb_callback = keras.callbacks.TensorBoard(log_dir="logs/{}".format(time()))

model.fit(ds, epochs=5, steps_per_epoch=1000, callbacks=[tb_callback])
#loss = model.evaluate(ds, steps=1000)
#print("Loss: %r" % loss)

#print("Prediction: ")
#for _ in xrange(5):
#  xs =





