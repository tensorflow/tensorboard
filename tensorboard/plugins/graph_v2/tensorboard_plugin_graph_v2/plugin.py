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
"""A sample Angular plugin using dynamic loading."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os

import numpy as np
import six
from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.util import tensor_util
import werkzeug
from werkzeug import wrappers

from tensorboard.util import tb_logging

from tensorboard_plugin_graph_v2 import metadata

logger = tb_logging.get_logger()

class GraphV2Plugin(base_plugin.TBPlugin):
  plugin_name = metadata.PLUGIN_NAME

  def __init__(self, context):
    self._multiplexer = context.multiplexer

  def is_active(self):
    return bool(self._multiplexer.PluginRunToTagToContent(metadata.PLUGIN_NAME))

  def get_plugin_apps(self):
    override_static_path = os.environ.get("TENSORBOARD_GRAPH_V2_PATH")
    static_path = override_static_path or os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'frontend/dist/frontend/')
    cache_timeout = 1 if override_static_path else 43200
    logger.info('%s frontend serving from %s with timeout %d' %
        (GraphV2Plugin.plugin_name, static_path, cache_timeout))

    static_route = '/data/plugin/graph_v2/static/'
    return {
        "/static/*":
            werkzeug.middleware.shared_data.SharedDataMiddleware(
                werkzeug.exceptions.NotFound(),
                {static_route: static_path},
                cache_timeout=cache_timeout
            )
    }

  def frontend_metadata(self):
    return base_plugin.FrontendMetadata(
        es_module_path="/static/index.js",
    )
