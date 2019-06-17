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
"""A sample plugin to demonstrate dynamic loading."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import textwrap

from tensorboard.plugins import base_plugin
import werkzeug
from werkzeug import wrappers


class ExamplePlugin(base_plugin.TBPlugin):
  plugin_name = 'example'

  def __init__(self, context):
    pass

  def is_active(self):
    return True

  def get_plugin_apps(self):
    return {
        "/plugin.js": self._serve_js,
    }

  def frontend_metadata(self):
    return super(ExamplePlugin, self).frontend_metadata()._replace(
        es_module_path="/plugin.js",
    )

  @wrappers.Request.application
  def _serve_js(self, request):
    del request  # unused
    filepath = os.path.join(os.path.dirname(__file__), "example.js")
    with open(filepath) as infile:
      contents = infile.read()
    return werkzeug.Response(
        contents,
        status=200,
        content_type="application/javascript",
    )
