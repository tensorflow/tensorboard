# Copyright 2017 Google Inc. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
import numpy as np
import six
from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin

class PrCurvesPlugin(base_plugin.TBPlugin):
  """A plugin that serves precision-recall curves for individual classes."""

  plugin_name = 'pr_curve'

  def __init__(self, context):
    """Instantiates a PrCurvesPlugin.
    Args:
      context: A base_plugin.TBContext instance. A magic container that
        TensorBoard uses to make objects available to the plugin.
    """
    self._multiplexer = context.multiplexer

  @wrappers.Request.application
  def pr_curves_route(self, request):
    """A route that returns a JSON mapping between runs and PR curve data.

    Returns:
      Given a tag and a comma-separated list of runs (both stored within GET
      parameters), fetches a JSON object that maps between run name and objects
      containing data required for PR curves for that run. Runs that either
      cannot be found or that lack tags will be excluded from the response.
    """
    comma_separated_runs = request.args.getlist('run')
    runs = comma_separated_runs.split(',') if comma_separated_runs else []
    tag = request.args.get('tag')

    response_mapping = {}
    for run in runs:
      try:
        tensor_events = self._multiplexer.Tensors(run, tag)
      except KeyError:
        return http_util.Respond(
            request,
            'No PR curves could be fetched for run %r and tag %r' % (run, tag),
            'text/plain',
            400)
      
      response_mapping[run] = [
          self._process_tensor_event(e) for e in tensor_events]

    # We convert the tensor data into a JSON-able response.
    return http_util.Respond(request, response_mapping, 'application/json')

  @wrappers.Request.application
  def tags_route(self, request):
    """A route (HTTP handler) that returns a response with tags.
    Returns:
      A response that contains a JSON object. The keys of the object
      are all the runs. Each run is mapped to a (potentially empty)
      list of all tags that are relevant to this plugin.
    """
    all_runs = self._multiplexer.PluginRunToTagToContent(
        PrCurvesPlugin.plugin_name)
    response = {
        run: list(tagToContent.keys())
             for (run, tagToContent) in all_runs.items()
    }
    return http_util.Respond(request, response, 'application/json')

  def get_plugin_apps(self):
    """Gets all routes offered by the plugin.

    Returns:
      A dictionary mapping URL path to route that handles it.
    """
    return {
        '/tags': self.tags_route,
        '/pr_curves': self.pr_curves_route,
    }

  def is_active(self):
    """Determines whether this plugin is active.

    This plugin is active only if PR curve summary data is read by TensorBoard.
    
    Returns:
      Whether this plugin is active.
    """
    if not self._multiplexer:
      return False

    all_runs = self._multiplexer.PluginRunToTagToContent(
        PrCurvesPlugin.plugin_name)

    # The plugin is active if any of the runs has a tag relevant to the plugin.
    return any(six.itervalues(all_runs))

  def _process_tensor_event(self, event):
    """Converts a TensorEvent into an dict that encapsulates information on it.
    
    Args:
      event: The TensorEvent to convert.
    """
    data_array = tf.make_ndarray(event.tensor_proto)
    return {
        'wall_time': event.wall_time,
        'step': event.step,
        'precision': data_array[4].tolist(),
        'recall': data_array[5].tolist(),
    }
