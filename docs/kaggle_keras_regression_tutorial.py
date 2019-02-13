
from time import time

import numpy as np
from tensorflow import keras

#from tensorflow.python.ops import summary_ops_v2 as tf_summary
#from tensorboard.summary import v2 as summary

# Create some data and randomize it.
X = np.linspace(-1, 1, 200)
#X = np.linspace(-1000, 1000, 200)
np.random.shuffle(X)

# f(X) = 0.5X + 2 + noise
Y = 0.5 * X + 2 + np.random.normal(0, 0.05, (200, ))

# Split into test and train data.
X_train, Y_train = X[:160], Y[:160]
X_test, Y_test = X[160:], Y[160:]

model = keras.models.Sequential([
    keras.layers.Dense(1, input_dim=1),
])

logdir="logs/{}".format(time())
tb_callback = keras.callbacks.TensorBoard(
    log_dir=logdir,
    histogram_freq=10,
    update_freq='batch'
)
#tf_summary.create_file_writer(logdir).set_as_default()

# Doesn't work.
#summary.scalar('test', data=100, step=0, description='A test scalar')

model.compile(
    loss='mape',
    optimizer=keras.optimizers.Adam())

model.fit(X_train, Y_train,
          batch_size=len(X_train),
          epochs=3000,
          validation_data=(X_test, Y_test),
          callbacks=[tb_callback])

#tb_callback = model.evaluate(X_test, Y_test, callbacks=[tb_callback])
#print("Loss: " + str(loss))

#print('\nTesting ------------')
#cost = model.evaluate(X_test, Y_test, batch_size=40)
#print('test cost:', cost)
W, b = model.layers[0].get_weights()
print('Weights=', W, '\nbiases=', b)