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
"""Validates responses and their security features"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import re

from werkzeug import wrappers
from werkzeug.datastructures import Headers
from werkzeug import http

from tensorboard.util import tb_logging

Policy = collections.namedtuple("Poicy", ["name", "rules"])

logger = tb_logging.get_logger()

_HTML_MIME_TYPE = "text/html"
_CSP_PATTERN = re.compile(r"^([a-z]+-[a-z]+)(.*)")
_CSP_DEFAULT_SRC = "default-src"
# Whitelist of allowed CSP rules.
_CSP_IGNORE = {
    "frame-ancestors": "*",
    "style-src": ["'unsafe-inline'", "data:"],
    "img-src": ["blob:", "data:"],
    "script-src": ["'unsafe-eval'"],
}


class SecurityValidatorMiddleware(object):
  """WSGI middleware validating security on response.

  It validates:
  - responses have Content-Type
  - responses have X-Content-Type-Options: nosniff
  - text/html responses have CSP header.

  Instances of this class are WSGI applications (see PEP 3333).
  """

  def __init__(self, application):
    """Initializes an `SecurityValidatorMiddleware`.

    Args:
      application: The WSGI application to wrap (see PEP 3333).
    """
    self._application = application

  def __call__(self, environ, start_response):

    def start_resposne_proxy(status, headers, exc_info=None):
      self._validate_headers(headers)
      return start_response(status, headers, exc_info)

    return self._application(environ, start_resposne_proxy)

  def _validate_headers(self, headers_list):
    headers = Headers(headers_list)
    self._validate_content_type(headers)
    self._validate_x_content_type_options(headers)
    self._validate_csps(headers)

  def _validate_content_type(self, headers):
    if headers.get("Content-Type"):
      return

    self._maybe_raise_value_error("Content-Type is required on a Response")

  def _validate_x_content_type_options(self, headers):
    # Both none and empty string are
    option = headers.get("X-Content-Type-Options")
    if option == "nosniff":
      return

    self._maybe_raise_value_error(
        'X-Content-Type-Options is required to be "nosniff"'
    )

  def _validate_csps(self, headers):
    mime_type, _ = http.parse_options_header(headers.get("Content-Type"))
    if mime_type != _HTML_MIME_TYPE:
      return

    csp_texts = headers.get_all("Content-Security-Policy")
    policies = []

    for csp_text in csp_texts:
      policies += self._parse_csp_text(csp_text)

    self._validate_csp_policies(policies)

  def _validate_csp_policies(self, policies):
    has_default_src = False
    violations = []

    for name, rules in policies:
      has_default_src = has_default_src or name == _CSP_DEFAULT_SRC

      for rule in rules:
        if rule in _CSP_IGNORE.get(name, []):
          # There are cases where certain values are legitimate.
          continue

        if (
            rule == "'self'" or rule == "'none'" or rule.startswith("https:")
            or rule.startswith("'sha256-")
        ):
          continue

        msg = "Illegal Content-Security-Policy for {name}: {rule}".format(
            name=name, rule=rule
        )
        violations.append(msg)

    if not has_default_src:
      violations.append("Requires default-src for Content-Security-Policy")

    if violations:
      self._maybe_raise_value_error("\n".join(violations))

  def _parse_csp_text(self, csp_text):
    csp_srcs = csp_text.split(";")
    policies = []
    for csp_src in csp_srcs:
      match = _CSP_PATTERN.match(csp_src)
      if not match or len(match.groups()) < 2:
        continue
      name, rules = _CSP_PATTERN.match(csp_src).groups()
      policies.append(
          Policy(
              name=name,
              rules=[rule.strip() for rule in rules.split(" ") if rule]
          )
      )

    return policies

  def _maybe_raise_value_error(self, error_msg):
    logger.warn("In 3.0, this warning will become an error:\n%s" % error_msg)
    # TODO(3.x): raise a value error.
