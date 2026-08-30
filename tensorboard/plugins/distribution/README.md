# The Distribution Dashboard

## Overview

The distributions dashboard lets users

*	Create line charts to display the change in the biases and weights of tensors over time.
*	Visualize high level statistics, with each line on the graph representing a percentile in the distribution, and the closeness of those lines representing how tightly the variables are being packed into a normal distribution

To use this dashboard, first collect data with summaries and tag it as a histogram, then lay out the UI.

![The Distribution Dashboard](https://user-images.githubusercontent.com/46605868/78409608-168dd100-75d8-11ea-987e-122689d99252.png)

## The problem it solves

The distributions dashboard flattens the display in the histograms dashboard, allowing for easier identification of which percentile of the biases and weights require the most change. The dashboard also includes a transparent overlay of the previous layers results, making it easier to visualize just how much each layer improves results.

## Collecting data
In order to execute the distributions dashboard, users must first collect [data with summaries](https://www.tensorflow.org/api_docs/python/tf/summary). Both old and new style summaries can be accepted.

Data must also be given the histogram tag in order to appear in the distributions dashboard. This tag may be included in the tensorboard callback command as shown here,

* tensorboard_callback = tf.keras.callbacks.TensorBoard(log_dir=log_dir, histogram_freq=1)

As long as histogram_freq >= 1, the distribution/ histogram dashboards will automatically execute once tensorboard is called.

## Example Code
See the standard [tensorboard getting started code](https://www.tensorflow.org/tensorboard/get_started) for an example of collecting data with summaries and correctly setting the histogram variable

## Example of the Distributions Dashboard UI-
The code in the tensorboard getting started example produces this dashboard.

![The Distributions Dashboard Example](https://user-images.githubusercontent.com/46605868/78409824-b0ee1480-75d8-11ea-86cf-ed3475cf32d9.png)

Each drop down menu above represents a tensor, with each being named for what type of layer it is. The two above correspond to these lines in the example code:

* tf.keras.layers.Dense(512, activation='relu'),
* tf.keras.layers.Dense(10, activation='softmax')

Within the each category there are two graphs, each corresponding to the bias and the weights for that layer.

![A closer look at the bias graph](https://user-images.githubusercontent.com/46605868/78408528-6d45db80-75d5-11ea-9f62-f2cb2ff9ee91.png)

 With a closer look we can see that these graphs have 6 lines. These lines represent the different percentiles present in a histogram(from sigma + 3 to sigma - 3). The darker color present between the middle two lines delineates the area taken up by sigma + 1 to sigma – 1. 

The left side of the dashboard allows users to select runs they would like to see, and change the x-axis to display wall or relative time.
