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
"""TensorBoard core plugin package."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import functools
import mimetypes
import zipfile

import tensorflow as tf
from werkzeug import utils
from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin


class CorePlugin(base_plugin.TBPlugin):
  """Core plugin for TensorBoard.

  This plugin serves runs, configuration data, and static assets. This plugin
  should always be present in a TensorBoard WSGI application.
  """

  plugin_name = 'core'

  def __init__(self, context):
    """Instantiates CorePlugin.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._logdir = context.logdir
    self._multiplexer = context.multiplexer
    self._assets_zip_provider = context.assets_zip_provider

  def is_active(self):
    return True

  def get_plugin_apps(self):
    apps = {
        '/___rPc_sWiTcH___': self._send_404_without_logging,
        '/audio': self._redirect_to_index,
        '/data/logdir': self._serve_logdir,
        '/data/runs': self._serve_runs,
        '/events': self._redirect_to_index,
        '/favicon.ico': self._send_404_without_logging,
        '/graphs': self._redirect_to_index,
        '/histograms': self._redirect_to_index,
        '/images': self._redirect_to_index,
    }
    if self._assets_zip_provider:
      apps['/'] = functools.partial(self._serve_asset, 'index.html')
      with self._assets_zip_provider() as fp:
        with zipfile.ZipFile(fp) as zip_:
          for info in zip_.infolist():
            path = info.filename
            apps['/' + path] = functools.partial(self._serve_asset, path)
    return apps

  @wrappers.Request.application
  def _send_404_without_logging(self, request):
    return http_util.Respond(request, 'Not found', 'text/plain', code=404)

  @wrappers.Request.application
  def _redirect_to_index(self, unused_request):
    return utils.redirect('/')

  @wrappers.Request.application
  def _serve_asset(self, path, request):
    """Serves a static asset from the zip file."""
    mimetype = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with self._assets_zip_provider() as fp:
      with zipfile.ZipFile(fp) as zip_:
        with zip_.open(path) as file_:
          html = file_.read()
    return http_util.Respond(request, html, mimetype, expires=3600)

  @wrappers.Request.application
  def _serve_logdir(self, request):
    """Respond with a JSON object containing this TensorBoard's logdir."""
    return http_util.Respond(
        request, {'logdir': self._logdir}, 'application/json')

  @wrappers.Request.application
  def _serve_runs(self, request):
    """WSGI app serving a JSON object about runs and tags.

    Returns a mapping from runs to tagType to list of tags for that run.

    Args:
      request: A werkzeug request

    Returns:
      A werkzeug Response with the following content:
      {runName: {firstEventTimestamp: 123456.789}}
    """
    run_names = sorted(self._multiplexer.Runs())  # Why `sorted`? See below.
    def get_first_event_timestamp(run_name):
      try:
        return self._multiplexer.FirstEventTimestamp(run_name)
      except ValueError:
        tf.logging.warning('Unable to get first event timestamp for run %s',
                           run_name)
        # Put runs without a timestamp at the end. Their internal
        # ordering would be nondeterministic, but Python's sorts are
        # stable, so `sorted`ing the initial list above provides a
        # deterministic ordering. Of course, we cannot guarantee that
        # this will be append-only for new event-less runs.
        return float('inf')
    first_event_timestamps = {
        run_name: get_first_event_timestamp(run_name)
        for run_name in run_names
    }
    run_names.sort(key=first_event_timestamps.get)
    return http_util.Respond(request, run_names, 'application/json')
