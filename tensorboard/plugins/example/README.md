# Example plugin

## Overview

A sample plugin using TensorBoard’s dynamic plugin loading mechanism. It
doesn’t do anything useful at the moment, but a stock TensorBoard binary
(1.14+) will automatically load and display it.

This code happens to live in the TensorBoard repository, but is intended
to stand in for a third-party plugin developer’s separate repository. It
is not built with Bazel, and it only depends on TensorBoard through its
public APIs (under the assumption that TensorBoard is installed in an
active virtualenv).

## Usage

In this directory (`tensorboard/plugins/example`), in a virtualenv with
TensorBoard installed, run:

```
python setup.py develop
```

This will link the plugin into your virtualenv. You can edit the
plugin’s source code and data files and see changes reflected without
having to reinstall the plugin.

Then, just run

```
tensorboard --logdir /tmp/whatever
```

and open TensorBoard to see the plugin’s “hello world” screen.

After making changes to the Python code, you must restart TensorBoard
for your changes to take effect. If your plugin reads data files at
runtime, you can edit those and see changes reflected immediately.

You can run

```
python setup.py develop --uninstall
```

to unlink the plugin from your virtualenv, after which you can also
delete the `tensorboard_plugin_example.egg-info/` directory that the
original `setup.py` invocation created.
