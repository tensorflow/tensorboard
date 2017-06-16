# How to Develop TensorBoard

Running TensorBoard automatically asks Bazel to create a vulcanized HTML binary:

```sh
bazel run //tensorflow/tensorboard:tensorboard -- --logdir=/path/to/logs
```
