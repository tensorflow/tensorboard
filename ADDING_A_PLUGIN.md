# Developing a TensorBoard plugin

## Overview

This document will explain high level concepts using the [basic summary example][example-basic] and provide guidelines on plugin authorship.

To get started right away, you can clone one of these examples:
  - [Basic summary 'Greeter'](./tensorboard/examples/plugins/example_basic)
  - [Raw scalars](./tensorboard/examples/plugins/example_raw_scalars)

![Example screenshot](./docs/images/example_basic.png "Basic example plugin")

[example-basic]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/examples/plugins/example_basic

### Architecture

You know (and, we hope, love!) TensorBoard’s core features! However, in every TensorBoard user’s life, there comes a time when you want some cool new visualization that just doesn’t exist yet. That’s what the plugin system is for.

A plugin is comprised of three components:

  - The **Backend** is where you write Python code that does post-processing of your data and serves the data to your plugin frontend in the browser.
  - The **Frontend** is where your custom visualization lives.
  - The optional **Summary** component is how users of your plugins will write data that your plugin can read from their TensorFlow programs. See [docs](https://www.tensorflow.org/api_docs/python/tf/summary) for details.

The backend and frontend operate within a plugin lifecycle:

  - **1) Plugin initializes**: When a user starts `tensorboard --logdir ...`, TensorBoard discovers available plugins, allows them to parse command line flags if needed, and configures URL routes to be served.

  - **2) User loads TensorBoard**: When a user opens the frontend in a web browser, TensorBoard reads plugin frontend metadata and collects all active plugins.

  - **3) User opens the dashboard**: When a user selects the plugin's dashboard in the UI, TensorBoard loads an IFrame with the plugin's ES module and tells it to render.

  - **4) Plugin handles routes**: When a plugin's frontend makes URL requests to its backend, route handlers can respond with collected data.

### Backend: How the plugin processes data, and sends it to the browser

#### Terminology

First, let's define some terminology used in TensorBoard. Definitions can be found in [`base_plugin.py`].

  - `TBPlugin`: The base class for all plugins. Can be used as an entry point. Defining a TBPlugin is required.
  - `TBLoader`: The base class for plugins requiring flag parsing or custom loading. Defining a TBLoader is optional.
  - `TBContext`: The container of information passed from TensorBoard core to plugins when they are constructed. Includes 'logdir', 'flags', 'multiplexer', etc.
  - `EventMultiplexer`: The mechanism for reading event data across runs and tags. Other multiplexers exist for database providers, etc. Do not read events directly.

A plugin backend is responsible for providing information about its frontend counterpart, serving frontend resources, and surfacing necessary data to the frontend by implementing routes (endpoints). TensorBoard begins by detecting plugins using the [Python `entry_points` mechanism][entrypoints-spec]; see the example plugin's [`setup.py`][entrypoints-declaration] for a full example of how to declare a plugin. The entry point must define either a `TBPlugin` or `TBLoader` class.

[entrypoints-spec]: https://packaging.python.org/specifications/entry-points/
[entrypoints-declaration]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/setup.py#L31-L35
[`base_plugin.py`]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/plugins/base_plugin.py

You can start building the backend by subclassing `TBPlugin` in [`base_plugin.py`] with this structure:

```python
class MyPlugin(base_plugin.TBPlugin):
  plugin_name = "my_awesome_plugin"

  def __init__(self, context): # ...

  def get_plugin_apps(self):
    return { "/tags": self._serve_tags }

  ### Upon loading TensorBoard in browser
  def is_active(self): # ...

  def frontend_metadata(self):
    return base_plugin.FrontendMetadata(es_module_path = "/index.js", tab_name = "Awesome ML")

  ### Route handling
  def _serve_tags(self): # Returns a WSGI application that responds to the request.
```

#### TBPlugin

  - `plugin_name`: Required field used as a unique ID for the plugin. This must only contain alphanumeric characters, hyphens, and underscores.
  - `get_plugin_apps()`: This should return a `dict` mapping route paths to WSGI applications: e.g., `"/tags"` might map to `self._serve_tags`.
  - `is_active()`: This should return whether the plugin is active (whether there exists relevant data for the plugin to process). TensorBoard will hide inactive plugins from the main navigation bar. We strongly recommend this to be a cheap operation.
  - `frontend_metadata()`: Defines how the plugin will be displayed on the frontend. See [`base_plugin.FrontendMetadata()`](https://github.com/tensorflow/tensorboard/blob/18dec9279e18a8222c9d83f90219ecddad591c46/tensorboard/plugins/base_plugin.py#L101).
    - `disable_reload`: Whether to disable the reload button and auto-reload timer. A `bool`; defaults to `False`.
    - `es_module_path`: ES module to use as an entry point to this plugin. A `str` that is a key in the result of `get_plugin_apps()`.
    - `remove_dom`: Whether to remove the plugin DOM when switching to a different plugin. A `bool`; defaults to `False`.
    - `tab_name`: Name to show in the menu item for this dashboard within the navigation bar. May differ from the plugin name. An optional `str`, that defaults to the plugin name.

If your plugin requires parsing flags or custom loading, consider defining a `TBLoader` as the entry point. Doing so is optional.

For example:

```python
class MyLoader(base_plugin.TBLoader):
  def define_flags(self, parser):
    parser.add_argument_group('custom').add_argument('--enable_my_extras')

  def fix_flags(self, flags):
    if flags.enable_my_extras:
      raise ValueError('Extras not ready')

  def load(self, context):
    return MyPlugin(context)
```

#### TBLoader

  - `define_flags(parser)`: Optional method that takes an argparse.Namespace and exposes command-line flags. Please prefix flags with the name of the plugin to avoid collision.
  - `fix_flags(flags)`: Optional method needed to fix or sanitize command-line flags.
  - `load(context)`: Required method that takes a TBContext and returns a TBPlugin instance.

It's recommended that plugins using flags call the `parser.add_argument_group(plugin_name)`. To learn more about the flag definition, see [docs](https://docs.python.org/library/argparse.html#adding-arguments)

## Reading data from event files

On instantiation, a plugin is provided a [`PluginEventMultiplexer`] object as a field on the TBContext, from which to read data. The `PluginRunToTagToContent` method on the multiplexer returns a dictionary containing all run–tag pairs and associated summary metadata for your plugin.

Plugins are not technically restricted from arbitrary file system and network access, but we strongly recommend using the multiplexer exclusively. This abstracts over the filesystem (local or remote), provides a consistent user experience for runs and tags across plugins, and is optimized for TensorBoard read patterns.

[`PluginEventMultiplexer`]: https://github.com/tensorflow/tensorboard/blob/master/tensorboard/backend/event_processing/plugin_event_multiplexer.py

Example use of the multiplexer:
```python
class MyPlugin(base_plugin.TBPlugin):
  def __init__(self, context):
    self.multiplexer = context.multiplexer

  def preprocess_data(self):
    """
    {runName: { images: [tag1, tag2, tag3],
                scalarValues: [tagA, tagB, tagC],
                histograms: [tagX, tagY, tagZ],
                compressedHistograms: [tagX, tagY, tagZ],
                graph: true, meta_graph: true}}
    """
    runs = self.multiplexer.Runs()

    """
    [
      {wall_time: 100..., step: 1, tensor_proto: ...},
      {wall_time: 100..., step: 2, tensor_proto: ...},
      ...
    ]
    """
    events = self.multiplexer.Tensors(run, tag)

    """{run: {tag: content}, ...}"""
    content = PluginRunToTagToContent(plugin_name)
```

For the complete EventMultiplexer API, see [`PluginEventMultiplexer`][`PluginEventMultiplexer`].

### Frontend: How the plugin visualizes your new data

Now that we have an API, it’s time for the cool part: adding a visualization!

TensorBoard does not impose any framework/tool requirements for building a frontend—you can use React, Vue.js, jQuery, DOM API, or any new famous frameworks and use, for example, Webpack to create a JavaScript bundle. TensorBoard only requires an [ES Module] that is an entry point to your frontend ([example ES module][example-es-module]). Do note that all frontend resources have to be served by the plugin backend ([example backend][example-backend]).

When the dashboard opens, TensorBoard will create an IFrame and load the ES module defined by the backend's metadata. It will call the `render()` method in the module.

[ES Module]: https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/
[example-es-module]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/static/index.js#L16
[example-backend]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/plugin.py#L45

Consistency in user interface and experience, we believe, is important for happy users; for example, a run selection should be consistent for all plugins in TensorBoard. TensorBoard will provide a library that helps you build a dashboard like Scalars dashboard by providing UI components. We _will_ provide a library that can be bundled into your frontend binary (please follow [issue #2357][dynamic-plugin-tracking-bug] for progress):

[dynamic-plugin-tracking-bug]: https://github.com/tensorflow/tensorboard/issues/2357

We recommend that you vendor all resources required to use your plugin, including scripts, stylesheets, fonts, and images. All built-in TensorBoard plugins follow this policy.

### Summaries: How the plugin gets data

Your plugin will need to provide a way for users to log **summaries**, which are the mechanism for getting data from a TensorFlow model to disk and eventually into your TensorBoard plugin for visualization. For example, the example plugin provides a novel [“greeting” TensorFlow op][greeting-op] that writes greeting summaries. A summary is a protocol buffer with the following information:

  - tag: A string that uniquely identifies a data series, often supplied by the user (e.g., “loss”).
  - step: A temporal index (an integer), often batch number of epoch number.
  - tensor: The actual value for a tag–step combination, as a tensor of arbitrary shape and dtype (e.g., `0.123`, or `["one", "two"]`).
  - metadata: Specifies [which plugin owns the summary][owner-identifier], and provides an arbitrary plugin-specific payload.

[greeting-op]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/summary_v2.py#L28-L48
[owner-identifier]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/example/tensorboard_plugin_example/summary_v2.py#L64

## Distribution

A plugin should be distributed as a Pip package, and may be uploaded to PyPI. Please follow the [PyPI distribution archive upload guide][pypi-upload] for more information.

[pypi-upload]: https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives

## Guideline on naming and branding

We recommend that your plugin have an intuitive name that reflects the functionality—users, seeing the name, should be able to identify that it is a TensorBoard plugin and its function. Also, we recommend that you include the name of the plugin as part of the Pip package. For instance, a plugin `foo` should be distributed in a Pip package named `tensorboard_plugin_foo`.

A predictable package naming scheme not only helps users find your plugin, but also helps you find a unique plugin name by surveying PyPI. TensorBoard requires that all loaded plugins have unique names. However, the plugin name can differ from the [user-facing display name][display-name]; display names are not strictly required to be unique.

[display-name]: https://github.com/tensorflow/tensorboard/blob/373eb09e4c5d2b3cc2493f0949dc4be6b6a45e81/tensorboard/plugins/base_plugin.py#L35-L39

Lastly, when distributing a custom plugin of TensorBoard, we recommend that it be branded as “Foo for TensorBoard” (rather than “TensorBoard Foo”). TensorBoard is distributed under the Apache 2.0 license, but the name itself is a trademark of Google LLC.
