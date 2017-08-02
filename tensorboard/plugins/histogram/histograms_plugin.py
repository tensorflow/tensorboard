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
"""The TensorBoard Histograms plugin.

This plugin's `/histograms` route returns a result of the form

    [[wall_time, step, [[left0, right0, count0], ...]], ...],

where each inner array corresponds to a single bucket in the histogram.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import random
import six
from werkzeug import wrappers

import numpy as np
import tensorflow as tf

from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.backend.event_processing import event_accumulator
from tensorboard.plugins import base_plugin
from tensorboard.plugins.histogram import metadata


class HistogramsPlugin(base_plugin.TBPlugin):
  """Histograms Plugin for TensorBoard.

  This supports both old-style summaries (created with TensorFlow ops
  that output directly to the `histo` field of the proto) and new-style
  summaries (as created by the `tensorboard.plugins.histogram.summary`
  module).
  """

  plugin_name = metadata.PLUGIN_NAME

  def __init__(self, context):
    """Instantiates HistogramsPlugin via TensorBoard core.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._multiplexer = context.multiplexer

  def get_plugin_apps(self):
    return {
        '/histograms': self.histograms_route,
        '/tags': self.tags_route,
    }

  def is_active(self):
    """This plugin is active iff any run has at least one histograms tag."""
    return bool(self._multiplexer) and any(self.index_impl().values())

  def index_impl(self):
    """Return {runName: {tagName: {displayName: ..., description: ...}}}."""
    runs = self._multiplexer.Runs()
    result = {run: {} for run in runs}

    # Old-style runs
    for (run, run_data) in six.iteritems(runs):
      for tag in run_data.get(event_accumulator.HISTOGRAMS, []):
        result[run][tag] = {'displayName': tag, 'description': ''}

    # New-style runs
    mapping = self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME)
    for (run, tag_to_content) in six.iteritems(mapping):
      for (tag, content) in six.iteritems(tag_to_content):
        content = metadata.parse_summary_metadata(content)
        summary_metadata = self._multiplexer.SummaryMetadata(run, tag)
        result[run][tag] = {'displayName': summary_metadata.display_name,
                            'description': plugin_util.markdown_to_safe_html(
                                summary_metadata.summary_description)}

    return result

  def histograms_impl(self, tag, run, downsample_to=50):
    """Result of the form `(body, mime_type)`, or `ValueError`.

    At most `downsample_to` events will be returned. If this value is
    `None`, then no downsampling will be performed.
    """
    #
    # Reconcile results from old-style and new-style runs (preferring
    # new-style runs if there's a conflict).
    tensor_events = None
    try:
      tensor_events = self._multiplexer.Tensors(run, tag)
    except KeyError:
      try:
        old_style_events = self._multiplexer.Histograms(run, tag)
      except KeyError:
        pass
      else:
        tensor_events = [self._convert_old_style_histogram_event(ev)
                         for ev in old_style_events]
    if tensor_events is None:
      raise ValueError('No histogram tag %r for run %r' % (tag, run))
    events = [[ev.wall_time, ev.step, tf.make_ndarray(ev.tensor_proto).tolist()]
              for ev in tensor_events]
    if downsample_to is not None and len(events) > downsample_to:
      indices = sorted(random.Random(0).sample(list(range(len(events))),
                                               downsample_to))
      events = [events[i] for i in indices]
    return (events, 'application/json')

  def _convert_tensor_event_to_json(self, ev):
    return [ev.wall_time, ev.step, tf.make_ndarray(ev.tensor_proto).tolist()]

  def _convert_old_style_histogram_event(self, ev):
    tensor_proto = self._convert_old_style_histogram_value(ev.histogram_value)
    return event_accumulator.TensorEvent(
        wall_time=ev.wall_time,
        step=ev.step,
        tensor_proto=tensor_proto)

  def _convert_old_style_histogram_value(self, histogram_value):
    bucket_lefts = [histogram_value.min] + histogram_value.bucket_limit[:-1]
    bucket_rights = histogram_value.bucket_limit[:-1] + [histogram_value.max]
    bucket_counts = histogram_value.bucket
    buckets = np.array(list(zip(bucket_lefts, bucket_rights, bucket_counts)))
    return tf.make_tensor_proto(buckets)

  @wrappers.Request.application
  def tags_route(self, request):
    index = self.index_impl()
    return http_util.Respond(request, index, 'application/json')

  @wrappers.Request.application
  def histograms_route(self, request):
    """Given a tag and single run, return array of histogram values."""
    tag = request.args.get('tag')
    run = request.args.get('run')
    try:
      (body, mime_type) = self.histograms_impl(tag, run)
      code = 200
    except ValueError as e:
      (body, mime_type) = (str(e), 'text/plain')
      code = 400
    return http_util.Respond(request, body, mime_type, code=code)
