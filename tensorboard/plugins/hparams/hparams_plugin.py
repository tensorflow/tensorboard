# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""The TensorBoard HParams plugin.

See `http_api.md` in this directory for specifications of the routes for this
plugin.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import werkzeug
from werkzeug import wrappers
from google.protobuf import json_format

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import error
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import list_session_groups


class HParamsPlugin(base_plugin.TBPlugin):
  """HParams Plugin for TensorBoard."""

  plugin_name = metadata.PLUGIN_NAME

  def __init__(self, context):
    """Instantiates HParams plugin via TensorBoard core.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._context = backend_context.Context(context)

  def get_plugin_apps(self):
    return {
        '/experiment': self.get_experiment_route,
        '/session_groups': self.list_session_groups_route,
    }

  def is_active(self):
    """The hparams explorer plugin is active iff there is a tag with
    the hparams explorer plugin name as its plugin name."""
    if not self._context.multiplexer:
      return False
    return bool(self._context.multiplexer.PluginRunToTagToContent(
        metadata.PLUGIN_NAME))

  # ---- /experiment -----------------------------------------------------------
  @wrappers.Request.application
  def get_experiment_route(self, request):
    try:
      if not self.is_active():
        raise error.HParamsError("HParams plugin is not active.")

      return http_util.Respond(request,
                               json_format.MessageToJson(
                                   self._context.experiment()),
                               'application/json')
    except error.HParamsError as e:
      raise werkzeug.exceptions.BadRequest(description=str(e))

  # ---- /session_groups -------------------------------------------------------
  @wrappers.Request.application
  def list_session_groups_route(self, request):
    try:
      if not self.is_active():
        raise error.HParamsError("HParams plugin is not active.")
      # args.get() returns the request unquoted.
      request_proto = request.args.get('request')
      if request_proto is None:
        raise error.HParamsError('/session_groups must have a \'request\' arg.')
      request_proto = json_format.Parse(request_proto,
                                        api_pb2.ListSessionGroupsRequest())
      return http_util.Respond(
          request,
          json_format.MessageToJson(
              list_session_groups.Handler(self._context, request_proto).run()),
          'application/json')
    except error.HParamsError as e:
      raise werkzeug.exceptions.BadRequest(description=str(e))
