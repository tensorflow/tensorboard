# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Internal path prefix support for TensorBoard.

Using a path prefix of `/foo/bar` enables TensorBoard to serve from
`http://localhost:6006/foo/bar/` rather than `http://localhost:6006/`.
See the `--path_prefix` flag docs for more details.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import functools

import werkzeug


class FrameAncestorsMiddleware(object):
  """WSGI middleware for adding Content-Secuity-Policy for frame-ancestors.

  All requests to this middleware must begin with the specified path
  prefix (otherwise, a 404 will be returned immediately). Requests will
  be forwarded to the underlying application with the path prefix
  stripped and appended to `SCRIPT_NAME` (see the WSGI spec, PEP 3333,
  for details).
  """

  def __init__(self, application, frame_ancestors_flag):
    """Initializes this middleware.

    Args:
      application: The WSGI application to wrap (see PEP 3333).
      path_prefix: A string path prefix to be stripped from incoming
        requests. If empty, this middleware is a no-op. If non-empty,
        the path prefix must start with a slash and not end with one
        (e.g., "/tensorboard").
    """
    self._application = application
    self._flag = frame_ancestors_flag

  def __call__(self, environ, start_response):
    @functools.wraps(start_response)
    def new_start_response(status, headers):
      return start_response(status, self._headers_with_maybe_csp(headers))

    return self._application(environ, new_start_response)

  def _headers_with_maybe_csp(self, headers):
    """Add a Content-Security-Policy facilitating Colab output frames.
    This is intended for use with the `google.colab.kernel.proxyPort`
    JavaScript function available from within a Colab output frame.
    If the headers already include an explicit CSP, they are returned
    unchanged.
    Args:
      headers: A list of WSGI headers (key-value tuples of `str`s).
    Returns:
      A new list of WSGI headers; the original is unchanged.
    """
    # Do not attach CSP for non-HTMLs
    headers = werkzeug.Headers(headers)
    if not headers.get('Content-Type', type=str).startswith('text/html'):
      return headers.to_wsgi_list()

    flag = self._flag
    if flag == 'unsafe' or flag == 'notebook':
      allowed = '*'
    elif flag == 'colab':
      allowed = ' '.join([
          'https://*.googleusercontent.com',
          'https://*.google.com',
      ])
    else:
      allowed = "'none'"

    headers.add_header('Content-Security-Policy', 'frame-ancestors %s;' % allowed)

    return headers.to_wsgi_list()
