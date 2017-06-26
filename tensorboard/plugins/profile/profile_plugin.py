# -*- coding: utf-8 -*-
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

"""The TensorBoard plugin for performance profiling."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import logging
import os
import tensorflow as tf
from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.backend.event_processing import plugin_asset_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.profile import trace_events_json
from tensorboard.plugins.profile import trace_events_pb2

# The prefix of routes provided by this plugin.
_PLUGIN_PREFIX_ROUTE = 'profile'

# HTTP routes
LOGDIR_ROUTE = '/logdir'
DATA_ROUTE = '/data'
RUNS_ROUTE = '/tags'

# Available profiling tools -> file name of the tool data.
_FILE_NAME = 'TOOL_FILE_NAME'
TOOLS = {
    'trace_viewer': 'trace',
}


def process_raw_trace(raw_trace):
  """Processes raw trace data and returns the UI data."""
  trace = trace_events_pb2.Trace()
  trace.ParseFromString(raw_trace)
  return ''.join(trace_events_json.TraceEventsJsonStream(trace))


class ProfilePlugin(base_plugin.TBPlugin):
  """Profile Plugin for TensorBoard."""

  plugin_name = _PLUGIN_PREFIX_ROUTE

  def __init__(self, context):
    """Constructs a profiler plugin for TensorBoard.

    This plugin adds handlers for performance-related frontends.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self.logdir = context.logdir
    self.plugin_logdir = plugin_asset_util.PluginDirectory(
        self.logdir, ProfilePlugin.plugin_name)

  @wrappers.Request.application
  def logdir_route(self, request):
    return http_util.Respond(request, {'logdir': self.plugin_logdir},
                             'application/json')

  def _run_dir(self, run):
    run_dir = os.path.join(self.plugin_logdir, run)
    return run_dir if tf.gfile.IsDirectory(run_dir) else None

  def runs_impl(self):
    """Returns available runs and available tool data in the log directory.

    In the plugin log directory, each directory contains profile data for a
    single run (identified by the directory name), and files in the run
    directory contains data for different tools. The file that contains profile
    for a specific tool "x" will have a fixed name TOOLS["x"].
    Example:
      log/
        run1/
          trace
        run2/
          trace

    Returns:
      A map from runs to tool names e.g.
        {"run1": ["trace_viewer"], "run2": ["trace_viewer"]} for the example.
    """
    runs = {}
    if not tf.gfile.IsDirectory(self.plugin_logdir):
      return runs
    for run in tf.gfile.ListDirectory(self.plugin_logdir):
      run_dir = self._run_dir(run)
      if not run_dir:
        continue
      runs[run] = []
      for tool in TOOLS:
        tool_filename = TOOLS[tool]
        if tf.gfile.Exists(os.path.join(run_dir, tool_filename)):
          runs[run].append(tool)
    return runs

  @wrappers.Request.application
  def runs_route(self, request):
    runs = self.runs_impl()
    return http_util.Respond(request, runs, 'application/json')

  def data_impl(self, run, tool):
    """Retrieves and processes the tool data for a run.

    Args:
      run: Name of the run.
      tool: Name of the tool.

    Returns:
      A string that can be served to the frontend tool or None if tool or
        run is invalid.
    """
    # Path relative to the path of plugin directory.
    if tool not in TOOLS:
      return None
    data_path = os.path.join(run, TOOLS[tool])
    try:
      raw_data = plugin_asset_util.RetrieveAsset(
          self.logdir, ProfilePlugin.plugin_name, data_path)
    except KeyError as e:
      logging.warning('Failed to open data file %s. %s.', data_path, e.message)
      return None

    if tool == 'trace_viewer':
      return process_raw_trace(raw_data)
    return None

  @wrappers.Request.application
  def data_route(self, request):
    # params
    #   run: The run name.
    #   tag: The tool name e.g. trace_viewer. The plugin returns different UI
    #     data for different tools of the same run.
    run = request.args.get('run')
    tool = request.args.get('tag')
    data = self.data_impl(run, tool)
    if data is None:
      return http_util.Respond(request, '404 Not Found', 'text/plain', code=404)
    return http_util.Respond(request, data, 'text/plain')

  def get_plugin_apps(self):
    return {
        LOGDIR_ROUTE: self.logdir_route,
        RUNS_ROUTE: self.runs_route,
        DATA_ROUTE: self.data_route,
    }

  def is_active(self):
    """The plugin is active iff any run has at least one active tool/tag."""
    return any(self.runs_impl().values())
