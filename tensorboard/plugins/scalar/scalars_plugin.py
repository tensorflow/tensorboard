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
"""The TensorBoard Scalars plugin.

See `http_api.md` in this directory for specifications of the routes for
this plugin.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import csv

import six
from six import StringIO
from werkzeug import wrappers

import tensorflow as tf
from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.scalar import metadata


class OutputFormat(object):
  """An enum used to list the valid output formats for API calls."""
  JSON = 'json'
  CSV = 'csv'


class ScalarsPlugin(base_plugin.TBPlugin):
  """Scalars Plugin for TensorBoard."""

  plugin_name = metadata.PLUGIN_NAME

  def __init__(self, context):
    """Instantiates ScalarsPlugin via TensorBoard core.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._multiplexer = context.multiplexer

  def get_plugin_apps(self):
    return {
        '/scalars': self.scalars_route,
        '/tags': self.tags_route,
    }

  def is_active(self):
    """The scalars plugin is active iff any run has at least one scalar tag."""
    if not self._multiplexer:
      return False

    return bool(self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME))

  def index_impl(self):
    """Return {runName: {tagName: {displayName: ..., description: ...}}}."""
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

  def scalars_impl(self, tag, run, output_format):
    """Result of the form `(body, mime_type)`."""
    tensor_events = self._multiplexer.Tensors(run, tag)
    values = [[tensor_event.wall_time,
               tensor_event.step,
               tf.make_ndarray(tensor_event.tensor_proto).item()]
              for tensor_event in tensor_events]
    if output_format == OutputFormat.CSV:
      string_io = StringIO()
      writer = csv.writer(string_io)
      writer.writerow(['Wall time', 'Step', 'Value'])
      writer.writerows(values)
      return (string_io.getvalue(), 'text/csv')
    else:
      return (values, 'application/json')

  @wrappers.Request.application
  def tags_route(self, request):
    index = self.index_impl()
    return http_util.Respond(request, index, 'application/json')

  @wrappers.Request.application
  def scalars_route(self, request):
    """Given a tag and single run, return array of ScalarEvents."""
    # TODO: return HTTP status code for malformed requests
    tag = request.args.get('tag')
    run = request.args.get('run')
    output_format = request.args.get('format')
    (body, mime_type) = self.scalars_impl(tag, run, output_format)
    return http_util.Respond(request, body, mime_type)
