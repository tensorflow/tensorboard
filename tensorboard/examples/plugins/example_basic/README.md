# Developing a TensorBoard plugin

## Overview

You know (and, we hope, love!) TensorBoard’s core features like the scalar dashboard, the graph explorer, and the embedding projector. However, in every TensorBoard user’s life, there comes a time when they want some cool new visualization that just…doesn’t exist yet. That’s what the TensorBoard plugin system is for.

This document will explain high level concepts using the example plugin and provide guidelines on plugin authorship. To get started right away, jump to the [Local Development](#local-development) section.

A plugin is comprised of three components:

  - The **Backend** is where you write Python code that does post-processing of your data and serves the data to your plugin frontend in the browser.
  - The **Frontend** is where your custom visualization lives.
  - The optional **Summary** component is how users of your plugins will write data that your plugin can read from their TensorFlow programs.

### Backend: How the plugin processes data, and sends it to the browser

TensorBoard detects plugins using the [Python `entry_points` mechanism][entrypoints-spec]; see [the example plugin’s `setup.py`][entrypoints-declaration] for an example of how to declare a plugin to TensorBoard. The plugin backend is responsible for providing information about its frontend counterpart, serving frontend resources, and surfacing necessary data to the frontend by implementing routes (endpoints). You can start building the backend by subclassing `TBPlugin` in [`base_plugin.py`] (if your plugin does non-trivial work at the load time, consider using `TBLoader`). It must have a `plugin_name` (please refer to [naming](#guideline_on_naming_and_branding) section for naming your plugin) class attribute and implement the following methods:

  - `is_active`: This should return whether the plugin is active (whether there exists relevant data for the plugin to process). TensorBoard will hide inactive plugins from the main navigation bar. We strongly recommend this to be a cheap operation.
  - `get_plugin_apps`: This should return a `dict` mapping route paths to WSGI applications: e.g., `"/tags"` might map to `self._serve_tags`.
  - `define_flags`: Optional method needed to expose command-line flags. Please prefix flags with the name of the plugin to avoid collision.
  - `fix_flags`: Optional method needed to fix or sanitize command-line flags.

[entrypoints-spec]: https://packaging.python.org/specifications/entry-points/
[entrypoints-declaration]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/setup.py#L31-L35
[`base_plugin.py`]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/plugins/base_plugin.py

On instantiation, a plugin is provided a [`PluginEventMultiplexer`] object from which to read data. The `PluginRunToTagToContent` method on the multiplexer returns a dictionary containing all run–tag pairs and associated summary metadata for your plugin. For more information about summaries, please refer to the relevant section below.

Plugins are not technically restricted from arbitrary file system and network access, but we strongly recommend using the multiplexer exclusively. This abstracts over the filesystem (local or remote), provides a consistent user experience for runs and tags across plugins, and is optimized for TensorBoard read patterns.

[`PluginEventMultiplexer`]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/backend/event_processing/plugin_event_multiplexer.py

### Frontend: How the plugin visualizes your new data

Now that we have an API, it’s time for the cool part: adding a visualization.

TensorBoard does not impose any framework/tool requirements for building a frontend—you can use React, Vue.js, jQuery, DOM API, or any new famous frameworks and use, for example, Webpack to create a JavaScript bundle. TensorBoard only requires an [ES Module] that is an entry point to your frontend ([example ES module][example-es-module]). Do note that all frontend resources have to be served by the plugin backend ([example backend][example-backend])

[ES Module]: https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/
[example-es-module]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/static/index.js#L16
[example-backend]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/plugin.py#L45

Consistency in user interface and experience, we believe, is important for happy users; for example, a run selection should be consistent for all plugins in TensorBoard. TensorBoard will provide a library that helps you build a dashboard like Scalars dashboard by providing UI components. Below are components we _will_ provide as a library that can be bundled into your frontend binary (please follow [issue #2357][dynamic-plugin-tracking-bug] for progress):

[dynamic-plugin-tracking-bug]: https://github.com/tensorflow/tensorboard/issues/2357

- `tf-dashboard-layout`: A custom element that makes it easy to set up a sidebar section and main section within TensorBoard. The sidebar should hold configuration options, and the run selector.
- `tf-runs-selector`: A custom element to enable or disable various runs in the TensorBoard frontend.

### Summaries: How the plugin gets data

Your plugin will need to provide a way for users to log **summaries**, which are the mechanism for getting data from a TensorFlow model to disk and eventually into your TensorBoard plugin for visualization. For example, the example plugin provides a novel [“greeting” TensorFlow op][greeting-op] that writes greeting summaries. A summary is a protocol buffer with the following information:

  - tag: A string that uniquely identifies a data series, often supplied by the user (e.g., “loss”).
  - step: A temporal index (an integer), often batch number of epoch number.
  - tensor: The actual value for a tag–step combination, as a tensor of arbitrary shape and dtype (e.g., `0.123`, or `["one", "two"]`).
  - metadata: Specifies [which plugin owns the summary][owner-identifier], and provides an arbitrary plugin-specific payload.

[greeting-op]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/summary_v2.py#L28-L48
[owner-identifier]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/summary_v2.py#L64

## Guideline on naming and branding

We recommend that your plugin have an intuitive name that reflects the functionality—users, seeing the name, should be able to identify that it is a TensorBoard plugin and its function. Also, we recommend that you include the name of the plugin as part of the Pip package. For instance, a plugin `foo` should be distributed in a Pip package named `tensorboard_plugin_foo`.

A predictable package naming scheme not only helps users find your plugin, but also helps you find a unique plugin name by surveying PyPI. TensorBoard requires that all loaded plugins kave unique names. However, the plugin name can differ from the [user-facing display name][display-name]; display names are not strictly required to be unique.

[display-name]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/base_plugin.py#L35-L39

Lastly, when distributing a custom plugin of TensorBoard, we recommend that it be branded as “Foo for TensorBoard” (rather than “TensorBoard Foo”). TensorBoard is distributed under the Apache 2.0 license, but the name itself is a trademark of Google LLC.

## Local Development

To get started right away, copy the directory `tensorboard/examples/plugins/example_basic` into a desired folder and, in a virtualenv with TensorBoard installed, run:

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

## Distribution

A plugin should be distributed as a Pip package, and may be uploaded to PyPI. Please follow the [PyPI distribution archive upload guide][pypi-upload] for more information.

[pypi-upload]: https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives
