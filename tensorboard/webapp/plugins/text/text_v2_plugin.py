# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Angular Version of Text Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import textwrap

# Necessary for an internal test with special behavior for numpy.
import numpy as np

import six
from werkzeug import wrappers

from tensorboard import plugin_util
from tensorboard.util import tensor_util
from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.data import provider
from tensorboard.plugins.text import metadata

# HTTP routes
TAGS_ROUTE = "/tags"
TEXT_ROUTE = "/text"

WARNING_TEMPLATE = textwrap.dedent(
    """\
  **Warning:** This text summary contained data of dimensionality %d, but only \
  2d tables are supported. Showing a 2d slice of the data instead."""
)

_DEFAULT_DOWNSAMPLING = 100  # text tensors per time series


def reduce_to_2d(arr):
    """Given a np.npdarray with nDims > 2, reduce it to 2d.

    It does this by selecting the zeroth coordinate for every dimension greater
    than two.

    Args:
      arr: a numpy ndarray of dimension at least 2.

    Returns:
      A two-dimensional subarray from the input array.

    Raises:
      ValueError: If the argument is not a numpy ndarray, or the dimensionality
        is too low.
    """
    if not isinstance(arr, np.ndarray):
        raise ValueError("reduce_to_2d requires a numpy.ndarray")

    ndims = len(arr.shape)
    if ndims < 2:
        raise ValueError("reduce_to_2d requires an array of dimensionality >=2")
    # slice(None) is equivalent to `:`, so we take arr[0,0,...0,:,:]
    slices = ([0] * (ndims - 2)) + [slice(None), slice(None)]
    return arr[slices]


def reduce_and_jsonify(text_ndarr):
    """Take a numpy.ndarray containing strings, and convert it into a
    json-compatible list, also squashing it to two dimensions if necessary.

    If the ndarray contains a single scalar string, then that ndarray is
    converted to a list. If it contains an array of strings,
    that array is converted to a list.  If the array contains dimensionality
    greater than 2, all but two of the dimensions are removed, and a warning
    boolean is set to true.  The list, shape of the array, and any warning
    boolean are returned.

    Args:
      text_arr: A numpy.ndarray containing strings.

    Returns:
        a tuple containing:
            The JSON-compatible list
            The shape of the array
            A warning boolean (true if array resized, false otherwise)
    """
    warning = False
    if not text_ndarr.shape:
        # It is a scalar. Just make json-compatible and return
        return text_ndarr.tolist(), text_ndarr.shape, warning
    if len(text_ndarr.shape) > 2:
        warning = True
        text_ndarr = reduce_to_2d(text_ndarr)
    return text_ndarr.tolist(), text_ndarr.shape, warning


def create_event(wall_time, step, string_ndarray):
    """Convert a text event into a JSON-compatible response with rank <= 2"""
    formatted_string_array, shape, warning = reduce_and_jsonify(string_ndarray)
    return {
        "wall_time": wall_time,
        "step": step,
        "string_array": formatted_string_array,
        "shape": shape,
        "warning": warning,
    }


class TextV2Plugin(base_plugin.TBPlugin):
    """Angular Text Plugin For TensorBoard"""

    plugin_name = "text_v2"

    def __init__(self, context):
        """Instantiates Angular TextPlugin via TensorBoard core.

        Args:
          context: A base_plugin.TBContext instance.
        """
        self._multiplexer = context.multiplexer
        self._downsample_to = (context.sampling_hints or {}).get(
            self.plugin_name, _DEFAULT_DOWNSAMPLING
        )
        if context.flags and context.flags.generic_data != "false":
            self._data_provider = context.data_provider
        else:
            self._data_provider = None

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            is_ng_component=True, tab_name="Text v2", disable_reload=False
        )

    def is_active(self):
        """Determines whether this plugin is active.

        This plugin is only active if TensorBoard sampled any text summaries.

        Returns:
          Whether this plugin is active.
        """
        if self._data_provider:
            return False  # `list_plugins` as called by TB core suffices
        if not self._multiplexer:
            return False
        return bool(
            self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME)
        )

    def index_impl(self, experiment):
        if self._data_provider:
            mapping = self._data_provider.list_tensors(
                experiment_id=experiment, plugin_name=metadata.PLUGIN_NAME,
            )
        else:
            mapping = self._multiplexer.PluginRunToTagToContent(
                metadata.PLUGIN_NAME
            )
        return {
            run: list(tag_to_content)
            for (run, tag_to_content) in six.iteritems(mapping)
        }

    def text_impl(self, run, tag, experiment):
        if self._data_provider:
            all_text = self._data_provider.read_tensors(
                experiment_id=experiment,
                plugin_name=metadata.PLUGIN_NAME,
                downsample=self._downsample_to,
                run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
            )
            text = all_text.get(run, {}).get(tag, None)
            if text is None:
                return []
            return [create_event(d.wall_time, d.step, d.numpy) for d in text]
        try:
            text_events = self._multiplexer.Tensors(run, tag)
        except KeyError:
            text_events = []
        return [
            create_event(
                e.wall_time, e.step, tensor_util.make_ndarray(e.tensor_proto)
            )
            for e in text_events
        ]

    @wrappers.Request.application
    def text_route(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        tag = request.args.get("tag")
        response = self.text_impl(run, tag, experiment)
        return http_util.Respond(request, response, "application/json")

    @wrappers.Request.application
    def tags_route(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        index = self.index_impl(experiment)
        return http_util.Respond(request, index, "application/json")

    def get_plugin_apps(self):
        return {
            TAGS_ROUTE: self.tags_route,
            TEXT_ROUTE: self.text_route,
        }
