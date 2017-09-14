# How to Develop TensorBoard

TensorBoard at HEAD relies on the nightly installation of TensorFlow, so please install TensorFlow nightly for development. To install TensorFlow nightly, `pip install` the link to the [appropriate whl file listed at the TensorFlow repository](https://github.com/tensorflow/tensorflow).

Our decision to develop on TensorFlow nightly has pros and cons. A main advantage is that plugin authors can use the latest features of TensorFlow. A disadvantage is that the previous release of TensorFlow does not suffice for development.

Running TensorBoard automatically asks Bazel to create a vulcanized HTML binary:

```sh
bazel run //tensorboard -- --logdir /path/to/logs
```

To generate fake data for a plugin, run its demo script. For instance, this command generates fake scalar data in `/tmp/scalars_demo`:

```sh
bazel run //tensorboard/plugins/scalar:scalars_demo
```
