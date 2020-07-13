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

from tensorboard.plugins import base_plugin
from tensorboard.backend import http_util
from tensorboard.plugins.text import metadata
from tensorboard import plugin_util
from tensorboard.data import provider
from tensorboard.util import tensor_util

# HTTP routes
TAGS_ROUTE = "/tags"
TEXT_ROUTE = "/text"

_DEFAULT_DOWNSAMPLING = 100  # text tensors per time series


def reduce_to_2d(arr):
    """Given a np.ndarray with nDims > 2, reduce it to 2d.

    It does this by selecting the zeroth coordinate for every dimension except
    the last two.

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
    greater than 2, all but two of the dimensions are removed, and a squashed
    boolean is set to true.  Returned is a list, the shape of the original
    array, and a boolean indicating squashsing has occured.

    Args:
        text_arr: A numpy.ndarray containing strings.

    Returns:
        a tuple containing:
            The JSON-compatible list
            The shape of the array (before being squashed)
            A boolean indicating if the array was squashed
    """
    original_shape = text_ndarr.shape
    truncated = False
    if not original_shape:
        # It is a scalar. Just make json-compatible and return
        return text_ndarr.tolist(), original_shape, truncated
    if len(original_shape) > 2:
        truncated = True
        text_ndarr = reduce_to_2d(text_ndarr)
    return text_ndarr.tolist(), original_shape, truncated


def create_event(wall_time, step, string_ndarray):
    """Convert a text event into a JSON-compatible response with rank <= 2"""
    formatted_string_array, original_shape, truncated = reduce_and_jsonify(
        string_ndarray
    )
    return {
        "wall_time": wall_time,
        "step": step,
        "string_array": formatted_string_array,
        "original_shape": original_shape,
        "truncated": truncated,
    }


class TextV2Plugin(base_plugin.TBPlugin):
    """Angular Text Plugin For TensorBoard"""

    plugin_name = "text_v2"

    def __init__(self, context):
        """Instantiates Angular TextPlugin via TensorBoard core.

        Args:
          context: A base_plugin.TBContext instance.
        """
        self._downsample_to = (context.sampling_hints or {}).get(
            self.plugin_name, _DEFAULT_DOWNSAMPLING
        )
        self._data_provider = context.data_provider

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
        return False  # `list_plugins` as called by TB core suffices

    def index_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx, experiment_id=experiment, plugin_name=metadata.PLUGIN_NAME,
        )
        return {
            run: list(tag_to_content)
            for (run, tag_to_content) in six.iteritems(mapping)
        }

    def text_impl(self, ctx, run, tag, experiment):
        all_text = self._data_provider.read_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
            downsample=self._downsample_to,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )
        text = all_text.get(run, {}).get(tag, None)
        if text is None:
            return []
        return [create_event(d.wall_time, d.step, d.numpy) for d in text]

    @wrappers.Request.application
    def text_route(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        tag = request.args.get("tag")
        response = self.text_impl(ctx, run, tag, experiment)
        return http_util.Respond(request, response, "application/json")

    @wrappers.Request.application
    def tags_route(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        index = self.index_impl(ctx, experiment)
        return http_util.Respond(request, index, "application/json")

    def get_plugin_apps(self):
        return {
            TAGS_ROUTE: self.tags_route,
            TEXT_ROUTE: self.text_route,
        }
