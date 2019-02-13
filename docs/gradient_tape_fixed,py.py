import numpy as np
import tensorflow as tf
from tensorflow import keras
print(tf.__version__)

num_samples = 100
input_dim = 1
output_dim = 1

x = np.random.random((num_samples, input_dim))
print(x.shape)
y = np.random.random((num_samples, output_dim))
print(y.shape)

model = keras.models.Sequential([
    keras.layers.Dense(output_dim, input_dim=input_dim),
])

optimizer = keras.optimizers.Adam()
for _ in range(10):
    with tf.GradientTape() as tape:
        y_predicted = model(x)
        loss = tf.reduce_sum(
            keras.losses.mean_absolute_percentage_error(y_predicted, y))
        print("Loss: " + str(loss))
        gradients = tape.gradient(loss, model.variables)
        optimizer.apply_gradients(zip(gradients, model.variables))