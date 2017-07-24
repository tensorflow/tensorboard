# How to Develop TensorBoard

Running TensorBoard automatically asks Bazel to create a vulcanized HTML binary:

```sh
bazel run //tensorboard -- --logdir /path/to/logs
```

If you need to generate fake data, run:

```sh
bazel run //tensorboard/plugins/scalar:scalars_demo
```

This will generate some fake scalar data in `/tmp/scalars_demo`.
