# Raw scalars example

## Overview

This example plugin is aimed at authors who wish to start by writing frontend code. Its backend provides an endpoint that serves scalar summary data (for example, written by `tf.summary.scalar()`) found within the `logdir`.

The frontend UI has a run selector component and a preview area, showing the scalar data for each tag within the selected run. Relevant source files are found in [`tensorboard_plugin_example/static/*`](https://github.com/tensorflow/tensorboard/blob/javascript/tensorboard/examples/plugins/example_raw_scalars/tensorboard_plugin_example/static). The frontend entry point is [`static/index.js`](https://github.com/tensorflow/tensorboard/blob/javascript/tensorboard/examples/plugins/example_raw_scalars/tensorboard_plugin_example/static/index.js).

To learn more about plugin authoring, see the [basic example docs](https://github.com/tensorflow/tensorboard/blob/javascript/tensorboard/examples/plugins/example_basic/README.md).

After copying this its [Getting Started](https://github.com/tensorflow/tensorboard/blob/javascript/tensorboard/examples/plugins/example_basic/README.md#getting-started) section on how to install.

## Getting started

Copy the directory `tensorboard/examples/plugins/example_raw_scalars` into a desired folder and, in a virtualenv with TensorBoard installed, run:

```
python setup.py develop
```

This will link the plugin into your virtualenv. Then, just run

```
tensorboard --logdir /tmp/whatever
```

and open TensorBoard to see the plugin’s “hello world” screen.

After making changes to [`static/index.js`](https://github.com/tensorflow/tensorboard/blob/javascript/tensorboard/examples/plugins/example_raw_scalars/tensorboard_plugin_example/static/index.js), you can refresh the page in your browser to see your changes. Adding new file assets and modifying the backend requires restarting the TensorBoard process.

To uninstall, you can run

```
python setup.py develop --uninstall
```

to unlink the plugin from your virtualenv, after which you can also delete the `tensorboard_plugin_example.egg-info/` directory that the original `setup.py` invocation created.
