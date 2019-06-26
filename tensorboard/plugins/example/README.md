# Developing a TensorBoard plugin

## Overview

You know (and, we hope, love!) TensorBoard’s core features like the scalar dashboard, the graph explorer, and the embedding projector. However, in every TensorBoard user’s life, there comes a time when they want some cool new visualization that just…doesn’t exist yet. That’s what the TensorBoard plugin system is for.

This is a live example of a custom TensorBoard plugin which visualizes greets written out by TensorFlow via custom summary ops. Copying the example will be a good starting point in which you can build a custom plugin.

## Development

### Usage

In this directory (`tensorboard/plugins/example`), in a virtualenv with TensorBoard installed, run:

```
python setup.py develop
```

This will link the plugin into your virtualenv. You can edit the plugin’s source code and data files and see changes reflected without having to reinstall the plugin.

Then, just run

```
tensorboard --logdir /tmp/whatever
```

and open TensorBoard to see the plugin’s “hello world” screen.

After making changes to the Python code, you must restart TensorBoard for your changes to take effect. If your plugin reads data files at runtime, you can edit those and see changes reflected immediately.

To uninstall, you can run

```
python setup.py develop --uninstall
```

to unlink the plugin from your virtualenv, after which you can also delete the `tensorboard_plugin_example.egg-info/` directory that the original `setup.py` invocation created.


### Three Easy Pieces

  - The **Summary layer** is how users of your plugins will write data that your plugin can read from their TensorFlow programs.
  - The **Backend layer** is where you write Python code that does post-processing of your data and serves the data to your plugin frontend in the browser.
  - The **Frontend layer** is where your custom visualization lives.

### Summary layer: How the plugin gets data

Your plugin will likely to visualize data logged by TensorFlow. You will need to provide a way for user to log data that your plugin later can identify. For example, the example plugin provides a novel greeting TensorFlow op that writes data in the form below.

A data written out as protocol buffer encodes follow: tensor, tag, step, and metadata. A Tensor is an actual value that is related to a specific tag and a specific step. A tag is a string that uniquely identifies a data series, often supplied by a user. A step encodes a temporal information which often is either batch or epoch number. Lastly, metadata can contain extra information about data and it can contain a plugin specific payload in addition to an owner identifier.

### Backend: How the plugin processes data, and sends it to the browser

A plugin backend is responsible for registering a plugin to TensorBoard. It also serves frontend resources and surfaces necessary data to the frontend by implementing routes (endpoints).

You can start building the backend by subclassing `TBPlugin` or `TBLoader` in [`base_plugin.py`]. It must have a `plugin_name` class attribute and implement the following methods:

  - `is_active`: This should return whether the plugin is active (whether there exists relevant data for the plugin to process). TensorBoard will hide inactive plugins from the main navigation bar.
  - `get_plugin_apps`: This should return a `dict` mapping route paths to WSGI applications: e.g., `"/tags"` might map to `self._serve_tags`.
  - `define_flags`: Optional method used to expose command-line flags.
  - `fix_flags`: : Optional method used to fix or sanitize command-line flags.

[`base_plugin.py`]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/plugins/base_plugin.py
[`EventMultiplexer`]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/backend/event_processing/event_multiplexer.py

To retrieve relevant data (tensors) read from summaries, the logic of your plugin’s route should call `PluginRunToTagToContent` in [`EventMultiplexer`] with the `plugin_name`. This returns a dictionary mapping from run name to all of the tags that are associated with your plugin. The tag names themselves map to the `content` from the `PluginData` proto.

Subsequently, with knowledge of which tags are relevant, your plugin can retrieve the tensors relevant to each tag. Call the `Tensors` method of the `multiplexer` object to retrieve the tensors sampled by TensorBoard.

### Frontend: How the plugin visualizes your new data

Now that we have an API and a Backend, it’s time for the cool part: adding a visualization.

TensorBoard does not impose any framework/tool requirements for building frontend: you can use React, Vue.js, jQuery, DOM API, or any new famous frameworks and use, for example, Webpack to create a JavaScript bundle. TensorBoard only requires an [ES Module] that is an entry point to your frontend. Do note that all frontend resources have to be served by the plugin backend.

[ES Module]: https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/

Consistency in user interface and experience, we believe, is important for happy users; for example, a run selection should be consistent for all plugins in TensorBoard. TensorBoard will provide a library that helps you build a dashboard like Scalars dashboard. Below are components we _will_ (please follow [#2357](https://github.com/tensorflow/tensorboard/issues/2357) for ETA on the library) provide as a library that can be bundled into your frontend binary:

- `tf-dashboard-layout`: A custom element that makes it easy to set up a sidebar section and main section within TensorBoard. The sidebar should hold configuration options, and the run selector.
- `tf-runs-selector`: A custom element to enable or disable various runs in the TensorBoard frontend.

## Distribution
A plugin should be distributed as a Pip package to PyPI. Please follow the guide [here](https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives).

## A note on naming

TensorBoard is distributed under the Apache 2.0 license, but the name itself is a trademark of Google LLC. When distributing a custom plugin of TensorBoard, we recommend that it be branded as “Foo for TensorBoard” (rather than “TensorBoard Foo”); packages may still be named `tensorboard_plugin_foo`.
