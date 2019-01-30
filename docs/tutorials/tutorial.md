# TensorBoard tutorial

Before running TensorBoard, make sure you have generated summary data in a log
directory by creating a summary writer:

``` python
# sess.graph contains the graph definition; that enables the Graph Visualizer.

file_writer = tf.summary.FileWriter('/path/to/logs', sess.graph)
```

For more details, see 
[the TensorBoard tutorial](https://www.tensorflow.org/get_started/summaries_and_tensorboard).
Once you have event files, run TensorBoard and provide the log directory. If
you're using a precompiled TensorFlow package (e.g. you installed via pip), run:

```
tensorboard --logdir path/to/logs
```

Or, if you are building from source:

```bash
bazel build tensorboard:tensorboard
./bazel-bin/tensorboard/tensorboard --logdir path/to/logs

# or even more succinctly
bazel run tensorboard -- --logdir path/to/logs
```

This should print that TensorBoard has started. Next, connect to
http://localhost:6006.

TensorBoard requires a `logdir` to read logs from. For info on configuring
TensorBoard, run `tensorboard --help`.

TensorBoard can be used in Google Chrome or Firefox. Other browsers might
work, but there may be bugs or performance issues.
