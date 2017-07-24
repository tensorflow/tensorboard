# Developing a TensorBoard plugin

<!-- This document was last reviewed on July 21, 2017. It should be
reviewed occasionally to make sure it stays up-to-date. -->

## Overview

You know (and, we hope, love!) TensorBoard's core features like the scalar dashboard, the graph explorer, and the embedding projector. However, in every TensorBoard user's life, there comes a time when they want some cool new visualization that just…doesn't exist yet. That's what this plugin system is for.

We want to enable everyone in the TensorFlow community to add new dashboards and visualizations to TensorBoard. You can do this by writing a TensorBoard plugin. Doing so requires you to have some familiarity with JavaScript development (for building a web-based visualization) and with Python development (for writing the plugin backend).

This document is a living guide on best practices for adding a plugin to TensorBoard. It will walk you through the different pieces in a TensorBoard plugin, describe best practices, and show you code examples.

## Background

To be successful writing a TensorBoard Plugin, you'll need to be familiar with general TensorBoard usage. We recommend starting with Dandelion Mané's [Hands-on TensorBoard] tutorial at the 2017 TensorFlow Dev Summit. We then recommend taking a look at the [TensorBoard README] and working through the tutorial.

[Hands-on TensorBoard]: https://www.youtube.com/watch?v=eBbEDRsCmv4&t=5s
[TensorBoard README]: https://github.com/tensorflow/tensorboard/blob/master/README.md

As a plugin developer, there are a few concepts you should be especially familiar with.


### TensorFlow summaries

The TensorFlow summary system captures tensors as they flow through the graph, and stores them to event logs on disk using [`tf.FileWriter`]. TensorBoard then reads these event log files into memory to extract [`Summary`] protobufs.

> Note: [Protocol Buffers][protobufs] are sort of like JSON objects, except they have schemas, a compiler that generates object mapping code for multiple languages, and a really efficient binary encoding, as well as text encoding format.

The following three fields of the `Summary` protobuf are the most important:

  - The `tag`, which is a string that is uniquely associated with a certain "stream" of related data.
  - The [`SummaryMetadata` object], which contains metadata associated with that `tag`, including plugin-specific metadata. You can store your own arbitrary binary encoded protobufs in its fields.
  - The [`TensorProto`] content field. We use `TensorProto` because they are generally a natural way of representing data in TensorFlow. Since `TensorProtos` support arbitrary byte arrays, you can put any kind of data in them.

[`tf.FileWriter`]: https://www.tensorflow.org/api_docs/python/tf/summary/FileWriter
[`Summary`]: https://github.com/tensorflow/tensorflow/blob/r1.3/tensorflow/core/framework/summary.proto#L62
[protobufs]: https://developers.google.com/protocol-buffers/
[`SummaryMetadata` object]: https://github.com/tensorflow/tensorflow/blob/r1.3/tensorflow/core/framework/summary.proto#L38
[`TensorProto`]: https://github.com/tensorflow/tensorflow/blob/r1.3/tensorflow/core/framework/tensor.proto#L14


### TensorBoard data model: runs and tags

Let's say you train a model with three sets of hyperparameters. Logically, you want to keep track of which data was associated with which set of hyperparameters, or which 'run' of TensorFlow. That gives us the TensorBoard concept of a `run`.

A `run` describes a sequence of events that came from a single execution context of TensorFlow. Each event has a timestamp and a monotonically increasing step counter, which was passed to the [`add_summary`] method.

You'll probably track multiple parameters in your model: say, the accuracy, precision, and cross-entropy. Each of these will have its own `tag`. Each `tag` tracks how a particular metric or measurement evolves over time. Each run may have many `tag`s.

Finally, the data for each run is stored in event files within a directory corresponding to that run. The directory name becomes the name of the run. When you launch TensorBoard, you specify a log directory (`logdir`); any runs under this directory will be picked up and loaded into TensorBoard.

[`add_summary`]: https://www.tensorflow.org/api_docs/python/tf/summary/FileWriter#add_summary


## Plugins: Three Easy Pieces

Now that we have the background out of the way, we can talk about plugins! Each plugin consists of three basic parts:

  - The **API layer** is how users of your plugins will write data that your plugin can read.
  - The **Backend layer** is where you write Python code that does post-processing of your data, and serves the data to your plugin frontend in the browser.
  - The **Frontend layer** is where your custom visualization lives.

### API layer: How the plugin gets data

Users of your plugin will use your API to emit protocol buffers containing the data that your plugin will visualize. In general, you should expose two ways of doing this: via a TensorFlow summary op, and by directly creating a protocol buffer.

For example, let's create a `Greeter` plugin. It provides a greeter `op` method, which creates a TensorFlow op that emits a string-tensor summary. It also provides a `pb` function that creates this directly, outside of a TensorFlow context. Standard TensorBoard plugins should follow this API.

Here's the code; we'll explain it below:

```python
"""This module provides summaries for the Greeter plugin."""

import tensorflow as tf


PLUGIN_NAME = 'greeter'


def op(name,
       guest,
       display_name=None,
       description=None,
       collections=None):
  """Create a TensorFlow summary op to greet the given guest.

  Arguments:
    name: A name for this summary operation.
    guest: A rank-0 string `Tensor`.
    display_name: If set, will be used as the display name
      in TensorBoard. Defaults to `name`.
    description: A longform readable description of the summary data.
      Markdown is supported.
    collections: Which TensorFlow graph collections to add the summary
      op to. Defaults to `['summaries']`. Can usually be ignored.
  """

  # The `name` argument is used to generate the summary op node name.
  # That node name will also involve the TensorFlow name scope.
  # By having the display_name default to the name argument, we make
  # the TensorBoard display clearer.
  if display_name is None:
    display_name = name
    message = tf.string_join(['Hello, ', guest, '!'])
    # Return a summary op that is properly configured.
    return tf.summary.tensor_summary(
      name,
      message,
      display_name=display_name,
      summary_description=description,
      collections=collections)


def pb(tag, guest, display_name=None, description=None):
  """Create a greeting summary for the given guest.

  Arguments:
    tag: The string tag associated with the summary.
    guest: The string name of the guest to greet.
    display_name: If set, will be used as the display name in
      TensorBoard. Defaults to `tag`.
    description: A longform readable description of the summary data.
      Markdown is supported.
    """
  message = 'Hello, %s!' % guest
  tensor = tf.make_tensor_proto(message, dtype=tf.string)

  summary_metadata = tf.SummaryMetadata(display_name=display_name,
                                        summary_description=description)
  metadata_content = '{}'  # We have no metadata to store.
  summary_metadata.plugin_data.add(plugin_name=PLUGIN_NAME,
                                   content=metadata_content)

  summary = tf.Summary()
  summary.value.add(tag=tag,
                    metadata=summary_metadata,
                    tensor=tensor)
  return summary
```

The `op` and `pb` methods above are two different ways of creating the same data: `Summary` protobufs containing `"Hello, $guest"` as a string tensor, with a unique `tag`, and with the appropriate metadata.

We've discussed above why we need the `tag` (to distinguish data series from each other) and the `tensor` (to hold the actual payload data). But why do we need metadata?

Without the metadata, there is no way for plugins to know which `Summary`s they are interested in. How would the `Greeter` plugin know that these `Summary`s weren't intended for a different plugin that also handles text data, and just happened to have "Hello" in the beginning of the message?

The `Greeter` plugin's summaries are distinguished by the fact that they all have a `plugin_data` entry in the `SummaryMetadata` which is marked with the `Greeter` `plugin_name`, which is, appropriately, `"greeter"`.

The `SummaryMetadata` can also contain additional information describing each series. TensorBoard uses it to store the `display_name` and `description`. These both describe the series of data as a whole, rather than individual data points, so it makes sense to put them in the metadata. Your plugin could also define some additional metadata—that can go in the `metadata_content` field. Traditionally, if you have `metadata_content`, you should put in either
- a custom protocol buffer for your plugin, serialized as a ByteString or String
- a JSON object, serialized as a string

The metadata may be quite long—imagine writing a long description (with hyperlinks, Markdown code blocks, et cetera) which explains exactly how a certain data series is calculated in your model. To save space, we don't write the metadata every time. The `tf.summary.FileWriter` only writes metadata once per tag. (Specifically: the `FileWriter` only writes metadata the *first* time it encounters a given tag. Afterwards, it discards the metadata.) Thus, changing the metadata for a given tag is a bad idea.

You might be wondering why we have `tag` and `display_name` as separate concepts. Why not always use the `tag` as the display name in TensorBoard?

This happens because we can't allow tags to collide. If tag collision happens, it's impossible to tell which data came from which series. TensorFlow prevents tag collision by using the summary op's node name as the tag; that means it is guaranteed to be unique by the TensorFlow naming system. But that also means implementation noise from the graph is included in a tag. If you add a scalar op with the name `"loss"` deep inside your graph, its tag might become something like `"tower1/layer8/loss"`. Keeping the display name as a separate concept ensures that your TensorBoard will still be easy to read.

For examples of some more realistic plugins, check out the [scalar][scalar plugin backend] and [histogram][histogram plugin backend] plugins included with TensorBoard.

[scalar plugin backend]: https://github.com/tensorflow/tensorboard/tree/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/scalar/scalars_plugin.py
[histogram plugin backend]:https://github.com/tensorflow/tensorboard/tree/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/histogram/histograms_plugin.py

Along with this module, you should include a demo module that generates representative data for your plugin, and which exercises all of your plugin's features. This script serves multiple purposes. First, it's useful for users of your plugin: they can inspect this script to see how to adapt it for their own uses. Second, it's useful for you as you're testing: you can always invoke this script to generate your test data. Third, you can use this in conjunction with your frontend unit tests: your demo script generates test data and your unit tests interact with your dashboard. Finally, by combining the demo scripts from various plugins, we can create a "mega-demo" that shows off all the features of TensorBoard.

As inspiration, here are the [scalar plugin demo] and [histogram plugin demo] included with TensorBoard.

[scalar plugin demo]: https://github.com/tensorflow/tensorboard/tree/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/scalar/scalars_demo.py
[histogram plugin demo]: https://github.com/tensorflow/tensorboard/tree/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/histogram/histograms_demo.py


### Backend: How the plugin processes data, and sends it to the browser

> **Note:** The backend APIs are under active development and might change. If you [create a GitHub issue] telling us that you're working on a plugin, then we can proactively reach out and help you update your code when API changes occur.

[create a GitHub issue]: https://github.com/tensorflow/tensorboard/issues/new

To provide routes (endpoints) for your plugin, create a subclass of `BasePlugin`. Your subclass must have a static `plugin_name` property, and you'll need to implement the following methods:

  - `__init__`: Your plugin will be passed a [`TBContext`] when it is constructed. Among other things, this context exposes an *[event multiplexer]*, which is used to access the actual summary data. You'll probably want to store this onto your plugin object for later use.
  - `is_active`: This should return whether the plugin is active (whether there exists relevant data for the plugin to process). TensorBoard will exclude inactive plugins from the main navigation bar.
  - `get_plugin_apps`: This should return a dictionary mapping routes to WSGI applications.

> Each entry in the result of get_plugin_apps should have its key a route name string, like /tags, and its value a WSGI application for handling that route. A WSGI application is just a Python function that handles HTTP traffic. The easiest way to create such a function is to use the @werkzeug.wrappers.Request.application decorator, which lets you write a simple function that takes a Request object and returns a Response object. (See below for an example.) You can read about the WSGI spec [here](https://www.python.org/dev/peps/pep-3333/).

[`TBContext`]: https://github.com/tensorflow/tensorboard/blob/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/base_plugin.py#L72
[event multiplexer]: https://github.com/tensorflow/tensorboard/blob/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/backend/event_processing/event_multiplexer.py

To retrieve relevant data (tensors) read from summaries, the logic of your plugin's route should call `PluginRunToTagToContent` with the `plugin_name`. This returns a dictionary mapping from run name to all of the tags that are associated with your plugin. The tag names themselves map to the `content` from the `PluginData` proto.

Subsequently, with knowledge of which tags are relevant, your plugin can retrieve the tensors relevant to each tag. Call the `Tensors` method of the `Multiplexer` object to retrieve the tensors sampled by TensorBoard.

Below, `GreeterPlugin` demonstrates how a very basic plugin works. To peruse the code of a real plugin, see [`TextPlugin`](https://github.com/tensorflow/tensorboard/blob/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/text/text_plugin.py) or any of the plugins within TensorBoard's GitHub repository.

```python
import tensorflow as tf
import numpy as np
import six
from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin

class GreeterPlugin(base_plugin.TBPlugin):
  """A plugin that serves greetings recorded during model runs."""

  # This static property will also be included within routes (URL paths)
  # offered by this plugin. This property must uniquely identify this plugin
  # from all other plugins.
  plugin_name = 'greeter'

  def __init__(self, context):
    """Instantiates a GreeterPlugin.

    Args:
      context: A base_plugin.TBContext instance. A magic container that
        TensorBoard uses to make objects available to the plugin.
    """
    # We retrieve the multiplexer from the context and store a reference
    # to it.
    self._multiplexer = context.multiplexer

  @wrappers.Request.application
  def tags_route(self, request):
    """A route (HTTP handler) that returns a response with tags.

    Returns:
      A response that contains a JSON object. The keys of the object
      are all the runs. Each run is mapped to a (potentially empty)
      list of all tags that are relevant to this plugin.
    """
    # This is a dictionary mapping from run to (tag to string content).
    # To be clear, the values of the dictionary are dictionaries.
    all_runs = self._multiplexer.PluginRunToTagToContent(
        GreeterPlugin.plugin_name)

    # tagToContent is itself a dictionary mapping tag name to string
    # content. We retrieve the keys of that dictionary to obtain a
    # list of tags associated with each run.
    response = {
        run: tagToContent.keys()
             for (run, tagToContent) in all_runs.items()
    }
    return http_util.Respond(request, response, 'application/json')

  def get_plugin_apps(self):
    """Gets all routes offered by the plugin.

    This method is called by TensorBoard when retrieving all the
    routes offered by the plugin.

    Returns:
      A dictionary mapping URL path to route that handles it.
    """
    # Note that the methods handling routes are decorated with
    # @wrappers.Request.application.
    return {
        '/tags': self.tags_route,
        '/greetings': self.greetings_route,
    }

  def is_active(self):
    """Determines whether this plugin is active.

    This plugin is only active if TensorBoard sampled any summaries
    relevant to the greeter plugin.

    Returns:
      Whether this plugin is active.
    """
    all_runs = self._multiplexer.PluginRunToTagToContent(
        GreeterPlugin.plugin_name)

    # The plugin is active if any of the runs has a tag relevant
    # to the plugin.
    return bool(self._multiplexer and any(six.itervalues(all_runs)))

  def _process_string_tensor_event(event):
    """Convert a TensorEvent into a JSON-compatible response."""
    string_arr = tf.make_ndarray(event.tensor_proto)
    text = string_arr.astype(numpy.dtype(str)).tostring()
    return {
        'wall_time': event.wall_time,
        'step': event.step,
        'text': text,
    }

  @wrappers.Request.application
  def greetings_route(self, request):
    """A route that returns the greetings associated with a tag.

    Returns:
      A JSON list of greetings associated with the run and tag
      combination.
    """
    run = request.args.get('run')
    tag = request.args.get('tag')

    # We fetch all the tensor events that contain greetings.
    tensor_events = self._multiplexer.Tensors(run, tag)

    # We convert the tensor data to text.
    response = [_process_string_tensor_event(ev) for
                ev in tensor_events]
    return http_util.Respond(request, response, 'application/json')
```

Note that the TensorBoard team is actively developing SQL databases as a backend
for TensorBoard plugins. Once that lands, we'll update the example plugin to use
a SQL backend. See [TensorBoard#92](https://github.com/tensorflow/tensorboard/issues/92)
for context.

### Frontend: How the plugin visualizes your new data

Now that we have an API and a Backend, it's time for the cool part: adding a visualization.

TensorBoard is built on [Polymer](https://www.polymer-project.org/) (1.x). Polymer makes it easy to define new custom components and embed them within other applications, which makes it great for embedding new visualizations and new dashboards into TensorBoard.

The first question to ask as you work on your plugin is: do you want to create a small, per-tag visualization (like the scalar chart, the histograms chart, or the image loader) and wrap it in a dashboard with standard TensorBoard UI organization? Or would you like to build everything from scratch, possibly with a single giant new visualization like the graph explorer or the projector plugin? Lots of the standard TensorBoard UI is meant to make it easy to search for different tags, so if you have one element for tag, you should use our UI helpers.

Either way, TensorBoard provides some shared frontend components to help you. You can find them at [tensorboard/components]. For example, `tf_backend` provides a `RequestManager` and other methods that make it convenient to request data from the TensorBoard backend, and `tf_color_scale` provides a single coordinated color scale for mapping runs to colors, in a way that is consistent across TensorBoard.

If you're planning on rolling your own dashboard without re-using much of the TensorBoard UI, you can pick and choose a few components that suit you, and mostly ignore the rest. Note that the TensorBoard toolbar and plugin selector at the top of the screen is not a part of any individual plugin, so it will always be there.

On the other hand, you might find it convenient to re-use the core TensorBoard UI pieces, like the categorizer and run selector. We've made it easy to do that. There are two kinds of plugins that we expect will re-use these UI elements: plugins that render a visualization for every (run, tag) combination, like the Histograms dashboard, and plugins that render a single visualization for every tag, displaying multiple runs all in the same chart. The Scalar dashboard is an example.

In either of these cases, we recommend starting with an existing dashboard that is relatively close to your use case, and modifying it to do what you need. We'll take a look at the [scalar dashboard code] and explain the key concepts.

First, you'll notice that the code imports a lot of components - both generic Polymer components like paper-input, and shared TensorBoard components like `tf-dashboard-layout` and `tf-category-pane`, and finally some plugin specific components like `tf-scalar-chart`.

Next, we dive in with setting up a standard dashboard layout. Here is an overview of some important components, described in the order they appear in the scalar dashboard:
- `tf-dashboard-layout`: Makes it easy to set up a sidebar section and main section within TensorBoard. The sidebar should hold configuration options, and the run selector.
- `tf-runs-selector`: The canonical way to enable or disable various runs in the TensorBoard frontend.
- `tf-category-pane`: After the tags have been grouped into `categories`, it displays a single category.
- `tf-paginated-view`: Paginates the elements in a category, so you can't overload the browser by instantiating hundreds at once.
- `tf-scalar-chart`: The actual visualization to instantiate. Swap this out in your own dashboards.


[tensorboard/components]:https://github.com/tensorflow/tensorboard/tree/master/tensorboard/components

[scalar dashboard code]:https://github.com/tensorflow/tensorboard/tree/c82300f188e4d2f4e1e2e029ce4019fd9e89a1e9/tensorboard/plugins/scalar/tf_scalar_dashboard/tf-scalar-dashboard.html#L128

## Integration

We're still polishing out how you integrate a new plugin into TensorBoard. For now, take a look at @jart's [TensorBoard Plugin Example](https://github.com/jart/tensorboard_plugin_example).
