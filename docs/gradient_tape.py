import numpy as np
import tensorflow as tf
from tensorflow import keras
from time import time

from tensorflow.python.ops import summary_ops_v2 as tf_summary
from tensorboard.summary import v2 as summary

print(tf.__version__)

# Create some data and randomize it.
# The syntax [:, np.newaxis] ensures the shape
# is correct (200, 1).
X = np.linspace(-1, 1, 200)[:, np.newaxis]
print(X.shape)
np.random.shuffle(X)

# f(X) = 0.5X + 2 + noise
Y = 0.5 * X + 2 + np.random.normal(0, 0.05, (200, ))

# Split into test and train data.
X_train, Y_train = X[:160], Y[:160]
X_test, Y_test = X[160:], Y[160:]

logdir="logs/gradient_tape/{}".format(time())
file_writer_train = tf_summary.create_file_writer(logdir + '/train')
file_writer_test = tf_summary.create_file_writer(logdir + '/test')

model = keras.models.Sequential([
    keras.layers.Dense(1, input_dim=1),
])

optimizer = keras.optimizers.Adam()

for step in xrange(3000):
  with tf.GradientTape() as tape:
    Y_predicted = model(X_train)
    loss = tf.reduce_sum(keras.losses.mean_absolute_percentage_error(Y_train, Y_predicted)) / 160
    gradients = tape.gradient(loss, model.variables)
    optimizer.apply_gradients(zip(gradients, model.variables))

    if (step % 50) == 0:
      print("Step %d: loss = %g" % (step, loss))

    # Log the training loss to TensorBoard.
    with file_writer_train.as_default():
      summary.scalar('loss', data=loss, step=step)

    # Log test loss to TensorBoard.
    Y_test_predicted = model(X_test)
    test_loss = tf.reduce_sum(keras.losses.mean_absolute_percentage_error(Y_test, Y_test_predicted)) / 40
    with file_writer_test.as_default():
      summary.scalar('loss', data=test_loss, step=step)


W, b = model.layers[0].get_weights()
print('Weights=', W, '\nbiases=', b)