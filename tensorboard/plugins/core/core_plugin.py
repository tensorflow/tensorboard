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
import gzip
import mimetypes
import zipfile

import six
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
    self._db_uri = context.db_uri
    self._window_title = context.window_title
    self._multiplexer = context.multiplexer
    self._db_connection_provider = context.db_connection_provider
    self._assets_zip_provider = context.assets_zip_provider

  def is_active(self):
    return True

  def get_plugin_apps(self):
    apps = {
        '/___rPc_sWiTcH___': self._send_404_without_logging,
        '/audio': self._redirect_to_index,
        '/data/environment': self._serve_environment,
        '/data/logdir': self._serve_logdir,
        '/data/runs': self._serve_runs,
        '/data/window_properties': self._serve_window_properties,
        '/events': self._redirect_to_index,
        '/favicon.ico': self._send_404_without_logging,
        '/graphs': self._redirect_to_index,
        '/histograms': self._redirect_to_index,
        '/images': self._redirect_to_index,
    }
    if self._assets_zip_provider:
      with self._assets_zip_provider() as fp:
        with zipfile.ZipFile(fp) as zip_:
          for path in zip_.namelist():
            gzipped_asset_bytes = _gzip(zip_.read(path))
            apps['/' + path] = functools.partial(
                self._serve_asset, path, gzipped_asset_bytes)
      apps['/'] = apps['/index.html']
    return apps

  @wrappers.Request.application
  def _send_404_without_logging(self, request):
    return http_util.Respond(request, 'Not found', 'text/plain', code=404)

  @wrappers.Request.application
  def _redirect_to_index(self, unused_request):
    return utils.redirect('/')

  @wrappers.Request.application
  def _serve_asset(self, path, gzipped_asset_bytes, request):
    """Serves a pre-gzipped static asset from the zip file."""
    mimetype = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    return http_util.Respond(
        request, gzipped_asset_bytes, mimetype, content_encoding='gzip')

  @wrappers.Request.application
  def _serve_environment(self, request):
    """Serve a JSON object containing some base properties used by the frontend.

    * data_location is either a path to a directory or an address to a
      database (depending on which mode TensorBoard is running in).
    * window_title is the title of the TensorBoard web page.
    """
    return http_util.Respond(
        request,
        {
            'data_location': self._logdir or self._db_uri,
            'window_title': self._window_title,
        },
        'application/json')

  @wrappers.Request.application
  def _serve_logdir(self, request):
    """Respond with a JSON object containing this TensorBoard's logdir."""
    # TODO(chihuahua): Remove this method once the frontend instead uses the
    # /data/environment route (and no deps throughout Google use the
    # /data/logdir route).
    return http_util.Respond(
        request, {'logdir': self._logdir}, 'application/json')

  @wrappers.Request.application
  def _serve_window_properties(self, request):
    """Serve a JSON object containing this TensorBoard's window properties."""
    # TODO(chihuahua): Remove this method once the frontend instead uses the
    # /data/environment route.
    return http_util.Respond(
        request, {'window_title': self._window_title}, 'application/json')

  @wrappers.Request.application
  def _serve_runs(self, request):
    """Serve a JSON array of run names, ordered by run started time.

    Sort order is by started time (aka first event time) with empty times sorted
    last, and then ties are broken by sorting on the run name.
    """
    if self._db_connection_provider:
      db = self._db_connection_provider()
      cursor = db.execute('''
        SELECT
          run_name,
          started_time IS NULL as started_time_nulls_last,
          started_time
        FROM Runs
        ORDER BY started_time_nulls_last, started_time, run_name
      ''')
      run_names = [row[0] for row in cursor]
    else:
      # Python's list.sort is stable, so to order by started time and
      # then by name, we can just do the sorts in the reverse order.
      run_names = sorted(self._multiplexer.Runs())
      def get_first_event_timestamp(run_name):
        try:
          return self._multiplexer.FirstEventTimestamp(run_name)
        except ValueError:
          tf.logging.warning(
              'Unable to get first event timestamp for run %s', run_name)
          # Put runs without a timestamp at the end.
          return float('inf')
      run_names.sort(key=get_first_event_timestamp)
    return http_util.Respond(request, run_names, 'application/json')


def _gzip(bytestring):
  out = six.BytesIO()
  # Set mtime to zero for deterministic results across TensorBoard launches.
  with gzip.GzipFile(fileobj=out, mode='wb', compresslevel=3, mtime=0) as f:
    f.write(bytestring)
  return out.getvalue()
