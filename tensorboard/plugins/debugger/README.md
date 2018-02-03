# The Debugger Dashboard

The debugger dashboard offers a graphical user interface for the [TensorFlow debugger](https://www.tensorflow.org/versions/r1.1/programmers_guide/debugger). For instance, this dashboard

* enables users to pause execution at specified ops or continue execution for some number of steps.
* visualizes values of tensors.
* links tensors to specific lines in python code.

![The Debugger Dashboard](images/debugger_intro.png)

# Setup

## Instrumenting Model Logic

To use this dashboard, construct a `TensorBoardDebugWrapperSession`. Subsequently, that wrapper session will issue gRPC messages to TensorBoard that containing data for debugging.

Pass the constructor

1. the original `tf.Session` object.
2. the `[[host]]:[[port]]` address to which to stream gRPC messages.

Example logic:

```python
from tensorflow.python import debug as tf_debug
sess = tf.Session()
sess = tf_debug.TensorBoardDebugWrapperSession(sess, 'localhost:4242')
sess.run(my_fetches)
```

## Start TensorBoard with the debugger_port flag.

In addition to instrumenting the model, the user must pass the `debugger_port` flag to TensorBoard. This port number matches the one above. TensorBoard will then both receive gRPC messages from and issue gRPC messages to model logic.

Example command for starting TensorBoard:

```
tensorboard \
    --logdir ~/project_foo/model_bar_logdir \
    --port 6006 \
    --debugger_port 4242 \
;
```
