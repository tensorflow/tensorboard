from __future__ import absolute_import, division, print_function

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import backend as K
from time import time
import numpy as np

# TODO(maniv): Remove this once tensorflow contains the v2 summary API.
from tensorflow.python.ops import summary_ops_v2 as tf_summary
import tensorboard.summary.v2 as summary

# TODO(maniv): Remove this once this script has been validated.
print(tf.__version__)

def my_function(x):
  """Returns a simple linear function of the input x."""
  #return (5 * x) + 10
  return x * x

DATA_LEN = 1000


def get_data():
  """Returns input and output data as (input, output). Each is a 1-dimensional array."""
  input_data = np.random.uniform(low=-100, high=100, size=DATA_LEN)
  output_data = my_function(input_data)
  return (input_data, output_data)

input_data, output_data = get_data()

# Partition into training (80%) and test (20%) sets.
TRAIN_END = int(DATA_LEN * 0.8)
input_train = input_data[:TRAIN_END]
input_test = input_data[TRAIN_END:]

output_train = output_data[:TRAIN_END]
output_test = output_data[TRAIN_END:]

# Train the model.

#model = keras.models.Sequential([
#   keras.layers.BatchNormalization(input_shape=(1,)),
#    keras.layers.Dense(32, 'relu'),
#    keras.layers.Dense(32, 'elu'),
#    keras.layers.Dense(1),
#])

model = keras.models.Sequential([
    keras.layers.Dense(32, activation='relu', input_dim=1),
    keras.layers.Dense(32, activation='elu'),
    keras.layers.Dense(1),
])


def rmse(y_true, y_pred):
  return K.sqrt(K.mean(K.square(y_pred - y_true)))

model.compile(loss='mape', optimizer=keras.optimizers.Adam(lr=0.05))
#model.compile(loss='mse', optimizer=keras.optimizers.Adam())

# Set up TensorBoard.
tb_callback = keras.callbacks.TensorBoard(log_dir="logs/{}".format(time()))

model.fit(
    x=input_data, y=output_data,
    epochs=10000,
    batch_size=len(input_train),
    validation_data=(input_test, output_test),
    callbacks=[tb_callback],
    verbose=0,
  )

loss = model.evaluate(input_test, output_test, callbacks=[tb_callback])
print("Loss: " + str(loss))

#model.save('x_squared.h5')

#print("Predictions: ")
#for _ in xrange(5):
#  x = np.random.randint(low=-10000, high=10000)
#  y_actual = my_function(x)
#  y_predicted = model.predict([x])[0]
#  print("x=%g, y_actual=%g, y_predicted=%g" % (x, y_actual, y_predicted))





