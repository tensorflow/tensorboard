import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.layers import Dense, Activation
from tensorflow.keras.models import Sequential
import matplotlib.pyplot as plt
import math
import time

print(tf.__version__)

x = np.random.uniform(low=-100, high=100, size=400)
x = np.sort(x)
#x = np.arange(-100, 100, 0.5)
y = x**2


model = Sequential()
model.add(keras.layers.BatchNormalization(input_shape=(1,)))
model.add(Dense(32))
model.add(Activation('relu'))
model.add(Dense(32))
model.add(Activation('elu'))
model.add(Dense(1))
model.compile(loss='mape', optimizer='adam')


#t1 = time.clock()
for i in range(20):
    model.fit(x, y, epochs=1000, batch_size=len(x), verbose=0)
    predictions = model.predict(x)
    print (i," ", np.mean(np.square(predictions - y))," t: ", time.clock()-t1)

    #plt.hold(False)
    plt.plot(x, y, 'b', x, predictions, 'r--')
    #plt.hold(True)
    plt.ylabel('Y / Predicted Value')
    plt.xlabel('X Value')
    plt.title([str(i)," Loss: ",np.mean(np.square(predictions - y))," t: ", str(time.clock()-t1)])
    #plt.pause(0.001)
#plt.show()