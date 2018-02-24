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

See `http_api.md` in this directory for specifications of the routes for
this plugin.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import random
import six
from werkzeug import wrappers

import numpy as np
import tensorflow as tf

from tensorboard import plugin_util
from tensorboard.backend import http_util
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
    self._db_connection_provider = context.db_connection_provider
    self._multiplexer = context.multiplexer

  def get_plugin_apps(self):
    return {
        '/histograms': self.histograms_route,
        '/tags': self.tags_route,
    }

  def is_active(self):
    """This plugin is active iff any run has at least one histograms tag."""
    if self._db_connection_provider:
      # The plugin is active if one relevant tag can be found in the database.
      db = self._db_connection_provider()
      cursor = db.execute('''
        SELECT
          1
        FROM Tags
        WHERE Tags.plugin_name = ?
        LIMIT 1
      ''', (metadata.PLUGIN_NAME,))
      return bool(list(cursor))

    return bool(self._multiplexer) and any(self.index_impl().values())

  def index_impl(self):
    """Return {runName: {tagName: {displayName: ..., description: ...}}}."""
    if self._db_connection_provider:
      # Read tags from the database.
      db = self._db_connection_provider()
      cursor = db.execute('''
        SELECT
          Tags.tag_name,
          Tags.display_name,
          Runs.run_name
        FROM Tags
        JOIN Runs
          ON Tags.run_id = Runs.run_id
        WHERE
          Tags.plugin_name = ?
      ''', (metadata.PLUGIN_NAME,))
      result = collections.defaultdict(dict)
      for row in cursor:
        tag_name, display_name, run_name = row
        result[run_name][tag_name] = {
            'displayName': display_name,
            # TODO(chihuahua): Populate the description. Currently, the tags
            # table does not link with the description table.
            'description': '',
        }
      return result

    runs = self._multiplexer.Runs()
    result = {run: {} for run in runs}

    mapping = self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME)
    for (run, tag_to_content) in six.iteritems(mapping):
      for (tag, content) in six.iteritems(tag_to_content):
        content = metadata.parse_plugin_metadata(content)
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
    if self._db_connection_provider:
      # Serve data from the database.
      db = self._db_connection_provider()
      # We select for steps greater than -1 because the writer inserts
      # placeholder rows en masse. The check for step filters out those rows.
      query = '''
        SELECT
          Tensors.computed_time AS computed_time,
          Tensors.step AS step,
          Tensors.data AS data,
          Tensors.dtype AS dtype,
          Tensors.shape AS shape
        FROM Tensors
        JOIN Tags
          ON Tensors.series = Tags.tag_id
        JOIN Runs
          ON Tags.run_id = Runs.run_id 
        WHERE
          Runs.run_name = ?
          AND Tags.tag_name = ?
          AND Tags.plugin_name = ?
          AND Tensors.step > -1
      '''
      if downsample_to is not None:
        # Wrap the query in an outer one that samples.
        query = '''
          SELECT *
          FROM 
            (%(query)s
             ORDER BY RANDOM()
             LIMIT %(downsample_to)d)
        ''' % {
            'query': query,
            'downsample_to': downsample_to,
        }
      query = '''
        %s
        ORDER BY step
      ''' % query
      cursor = db.execute(query, (run, tag, metadata.PLUGIN_NAME))
      events = [(row[0], row[1], self._get_values(row[2], row[3], row[4]))
                for row in cursor]
    else:
      # Serve data from events files.
      try:
        tensor_events = self._multiplexer.Tensors(run, tag)
      except KeyError:
        raise ValueError('No histogram tag %r for run %r' % (tag, run))
      events = [[e.wall_time, e.step, tf.make_ndarray(e.tensor_proto).tolist()]
                for e in tensor_events]
      if downsample_to is not None and len(events) > downsample_to:
        indices = sorted(random.Random(0).sample(list(range(len(events))),
                                                 downsample_to))
        events = [events[i] for i in indices]
    return (events, 'application/json')

  def _get_values(self, data_blob, dtype_enum, shape_string):
    """Obtains values for histogram data given blob and dtype enum.
    Args:
      data_blob: The blob obtained from the database.
      dtype_enum: The enum representing the dtype.
      shape_string: A comma-separated string of numbers denoting shape.
    Returns:
      The histogram values as a list served to the frontend.
    """
    buf = np.frombuffer(data_blob, dtype=tf.DType(dtype_enum).as_numpy_dtype)
    return buf.reshape([int(i) for i in shape_string.split(',')]).tolist()

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
