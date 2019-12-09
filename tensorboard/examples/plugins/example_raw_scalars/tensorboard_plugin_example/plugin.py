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
"""A sample plugin to demonstrate reading scalars."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import csv
import json
import os
import functools
import mimetypes

import six
from werkzeug import wrappers
import werkzeug

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard_plugin_example import metadata
from tensorboard.util import tensor_util

scalar_plugin_name = 'scalars'
plugin_folder = '/data/plugin/example_raw_scalars/'

class ExampleRawScalars(base_plugin.TBPlugin):
  """Raw summary example plugin for TensorBoard."""

  plugin_name = metadata.PLUGIN_NAME

  def __init__(self, context):
    """Instantiates ExampleRawScalars.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._multiplexer = context.multiplexer

  def get_plugin_apps(self):
    return {
        '/index.js': self._serve_index,
        '/scalars': self.scalars_route,
        '/runInfo': self._serve_run_info,
        '/static/*': self._serve_file,
    }

  @wrappers.Request.application
  def _serve_run_info(self, request):
    run_tag_mapping = self._multiplexer.PluginRunToTagToContent(
      scalar_plugin_name
    )

    # Convert to the form: {runName: [tagName, tagName, ...]}
    run_info = {}
    for run in run_tag_mapping:
      run_info[run] = run_tag_mapping[run].keys()

    return http_util.Respond(request, run_info, 'application/json')

  @wrappers.Request.application
  def _serve_index(self, request):
    del request  # unused
    filepath = os.path.join(os.path.dirname(__file__), "static", "index.js")
    with open(filepath) as infile:
      contents = infile.read()
    return werkzeug.Response(contents, content_type="application/javascript")

  @wrappers.Request.application
  def _serve_file(self, request):
    """Returns a resource file."""
    file_path = request.path
    if file_path.startswith(plugin_folder):
      file_path = file_path[len(plugin_folder):]
    res_path = os.path.join(os.path.dirname(__file__), file_path)

    with open(res_path, 'rb') as read_file:
      mimetype = mimetypes.guess_type(res_path)[0]
      return http_util.Respond(request, read_file.read(), content_type=mimetype)

  def is_active(self):
    return bool(self._multiplexer.PluginRunToTagToContent(scalar_plugin_name))

  def frontend_metadata(self):
    return base_plugin.FrontendMetadata(es_module_path="/static/index.js")

  def scalars_impl(self, tag, run):
    """Result of the form `(body, mime_type)`."""
    try:
      tensor_events = self._multiplexer.Tensors(run, tag)
      values = [(tensor_event.wall_time,
                tensor_event.step,
                tensor_util.make_ndarray(tensor_event.tensor_proto).item())
                for tensor_event in tensor_events]
    except (KeyError, ValueError) as e:
      raise errors.NotFoundError(
          'No scalar data for run=%r, tag=%r' % (run, tag)
      )

    return (values, 'application/json')

  @wrappers.Request.application
  def scalars_route(self, request):
    """Given a tag and single run, return array of ScalarEvents."""
    tag = request.args.get('tag')
    run = request.args.get('run')
    (body, mime_type) = self.scalars_impl(tag, run)
    return http_util.Respond(request, body, mime_type)
