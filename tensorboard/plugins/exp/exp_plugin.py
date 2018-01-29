# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""The TensorBoard Exp plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six
import numpy as np

import tensorflow as tf
from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin

# HTTP routes
TAGS_ROUTE = '/tags'
EXP_ROUTE = '/exp'


class ExpPlugin(base_plugin.TBPlugin):
  """Exp Plugin for TensorBoard."""

  plugin_name = 'exp'

  def __init__(self, context):
    """Instantiates TextPlugin via TensorBoard core.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._multiplexer = context.multiplexer


  def _process_string_tensor_event(self, event):
    """Convert a TensorEvent into a JSON-compatible response."""
    text = event.tensor_proto.string_val[0].decode('utf-8')
    return {
      'wall_time': event.wall_time,
      'step': event.step,
      'text': text,
    }

  def is_active(self):
    """Determines whether this plugin is active.

    This plugin is only active if TensorBoard sampled any exp summaries.

    Returns:
      Whether this plugin is active.
    """
    all_runs = self._multiplexer.PluginRunToTagToContent(ExpPlugin.plugin_name)

    # The plugin is active if any of the runs has a tag relevant
    # to the plugin.
    return bool(self._multiplexer and any(six.itervalues(all_runs)))

  @wrappers.Request.application
  def tags_route(self, request):
    all_runs = self._multiplexer.PluginRunToTagToContent(ExpPlugin.plugin_name)
    response = {
      run: list(tagToContent.keys())
      for (run, tagToContent) in all_runs.items()
    }
    return http_util.Respond(request, response, 'application/json')

  @wrappers.Request.application
  def exp_route(self, request):
    run = request.args.get('run')
    tag = request.args.get('tag')
    tensor_events = self._multiplexer.Tensors(run, tag)

    # We convert the tensor data to text.
    response = [self._process_string_tensor_event(ev) for
                ev in tensor_events]

    return http_util.Respond(request, response, 'application/json')

  def get_plugin_apps(self):
    return {
        TAGS_ROUTE: self.tags_route,
        EXP_ROUTE: self.exp_route,
    }
