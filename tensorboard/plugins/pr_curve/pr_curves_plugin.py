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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
import six
from werkzeug import wrappers

from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.pr_curve import metadata


class PrCurvesPlugin(base_plugin.TBPlugin):
  """A plugin that serves PR curves for individual classes."""

  plugin_name = metadata.PLUGIN_NAME

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
    runs = request.args.getlist('run')
    if not runs:
      return http_util.Respond(
          request, 'No runs provided when fetching PR curve data', 400)

    tag = request.args.get('tag')
    if not tag:
      return http_util.Respond(
          request, 'No tag provided when fetching PR curve data', 400)

    try:
      response = http_util.Respond(
          request, self.pr_curves_impl(runs, tag), 'application/json')
    except ValueError as e:
      return http_util.Respond(request, str(e), 'text/plain', 400)

    return response

  def pr_curves_impl(self, runs, tag):
    """Creates the JSON object for the PR curves response for a run-tag combo.

    Arguments:
      runs: A list of runs to fetch the curves for.
      tag: The tag to fetch the curves for.

    Raises:
      ValueError: If no PR curves could be fetched for a run and tag.

    Returns:
      The JSON object for the PR curves route response.
    """
    response_mapping = {}
    for run in runs:
      try:
        tensor_events = self._multiplexer.Tensors(run, tag)
      except KeyError:
        raise ValueError(
            'No PR curves could be fetched for run %r and tag %r' % (run, tag))

      content = self._multiplexer.SummaryMetadata(run, tag).plugin_data.content
      pr_curve_data = metadata.parse_plugin_metadata(content)
      thresholds = [
          float(v) / pr_curve_data.num_thresholds
          for v in range(1, pr_curve_data.num_thresholds + 1)]

      response_mapping[run] = [
          self._process_tensor_event(e, thresholds) for e in tensor_events]
    return response_mapping

  @wrappers.Request.application
  def tags_route(self, request):
    """A route (HTTP handler) that returns a response with tags.

    Returns:
      A response that contains a JSON object. The keys of the object
      are all the runs. Each run is mapped to a (potentially empty) dictionary
      whose keys are tags associated with run and whose values are metadata
      (dictionaries).

      The metadata dictionaries contain 2 keys:
        - displayName: For the display name used atop visualizations in
            TensorBoard.
        - description: The description that appears near visualizations upon the
            user hovering over a certain icon.
    """
    return http_util.Respond(
        request, self.tags_impl(), 'application/json')

  def tags_impl(self):
    """Creates the JSON object for the tags route response.

    Returns:
      The JSON object for the tags route response.
    """
    runs = self._multiplexer.Runs()
    result = {run: {} for run in runs}

    mapping = self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME)
    for (run, tag_to_content) in six.iteritems(mapping):
      for (tag, _) in six.iteritems(tag_to_content):
        summary_metadata = self._multiplexer.SummaryMetadata(run, tag)
        result[run][tag] = {'displayName': summary_metadata.display_name,
                            'description': plugin_util.markdown_to_safe_html(
                                summary_metadata.summary_description)}

    return result

  @wrappers.Request.application
  def available_time_entries_route(self, request):
    """Gets a dict mapping run to a list of time entries.
    Returns:
      A dict with string keys (all runs with PR curve data). The values of the
      dict are lists of time entries (consisting of the 3 fields below) to be
      used in populating values within time sliders.
    """
    return http_util.Respond(
        request, self.available_time_entries_impl(), 'application/json')

  def available_time_entries_impl(self):
    """Creates the JSON object for the available time entries route response.

    Returns:
      The JSON object for the available time entries route response.
    """
    all_runs = self._multiplexer.PluginRunToTagToContent(
        metadata.PLUGIN_NAME)
    response = {}

    # Compute the max step exhibited by any tag for each run. If a run lacks
    # data, exclude it from the mapping.
    for run, tag_to_content in all_runs.items():
      if not tag_to_content:
        # This run lacks data for this plugin.
        continue

      # Just use the list of tensor events for any of the tags to determine the
      # steps to list for the run. The steps are often the same across tags for
      # each run, albeit the user may elect to sample certain tags differently
      # within the same run. If the latter occurs, TensorBoard will show the
      # actual step of each tag atop the card for the tag.
      tensor_events = self._multiplexer.Tensors(
          run, min(six.iterkeys(tag_to_content)))
      response[run] = [self._create_time_entry(e) for e in tensor_events]
    return response

  def _create_time_entry(self, tensor_event):
    """Creates a time entry given a tensor event.

    Arguments:
      tensor_event: The tensor event for the time entry.
    """
    return {
        'step': tensor_event.step,
        'wall_time': tensor_event.wall_time,
    }

  def get_plugin_apps(self):
    """Gets all routes offered by the plugin.

    Returns:
      A dictionary mapping URL path to route that handles it.
    """
    return {
        '/tags': self.tags_route,
        '/pr_curves': self.pr_curves_route,
        '/available_time_entries': self.available_time_entries_route,
    }

  def is_active(self):
    """Determines whether this plugin is active.

    This plugin is active only if PR curve summary data is read by TensorBoard.

    Returns:
      Whether this plugin is active.
    """
    if not self._multiplexer:
      return False

    all_runs = self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME)

    # The plugin is active if any of the runs has a tag relevant to the plugin.
    return any(six.itervalues(all_runs))

  def _process_tensor_event(self, event, thresholds):
    """Converts a TensorEvent into a dict that encapsulates information on it.

    Args:
      event: The TensorEvent to convert.
      thresholds: An array of floats that ranges from 0 to 1 (in that
        direction and inclusive of 0 and 1).

    Returns:
      A JSON-able dictionary of PR curve data for 1 step.
    """
    data_array = tf.make_ndarray(event.tensor_proto)

    # Trim entries for which TP + FP = 0 (precision is undefined) at the tail of
    # the data.
    true_positives = [int(v) for v in data_array[metadata.TRUE_POSITIVES_INDEX]]
    false_positives = [
        int(v) for v in data_array[metadata.FALSE_POSITIVES_INDEX]]
    tp_index = metadata.TRUE_POSITIVES_INDEX
    fp_index = metadata.FALSE_POSITIVES_INDEX
    positives = data_array[[tp_index, fp_index], :].astype(int).sum(axis=0)
    end_index_inclusive = len(positives) - 1
    while end_index_inclusive > 0 and positives[end_index_inclusive] == 0:
      end_index_inclusive -= 1
    end_index = end_index_inclusive + 1

    return {
        'wall_time': event.wall_time,
        'step': event.step,
        'precision': data_array[metadata.PRECISION_INDEX, :end_index].tolist(),
        'recall': data_array[metadata.RECALL_INDEX, :end_index].tolist(),
        'true_positives': true_positives[:end_index],
        'false_positives': false_positives[:end_index],
        'true_negatives':
            [int(v) for v in
             data_array[metadata.TRUE_NEGATIVES_INDEX][:end_index]],
        'false_negatives':
            [int(v) for v in
             data_array[metadata.FALSE_NEGATIVES_INDEX][:end_index]],
        'thresholds': thresholds[:end_index],
    }
