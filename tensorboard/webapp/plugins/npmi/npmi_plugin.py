# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""The nPMI visualization plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import six
import numpy as np
from pathlib import Path
from werkzeug import wrappers
import werkzeug

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.util import tensor_util
from tensorboard.plugins import base_plugin
from tensorboard.backend import http_util


def _error_response(request, error_message):
    return http_util.Respond(
        request, {"error": error_message}, "application/json", code=400,
    )


def _missing_run_error_response(request):
    return _error_response(request, "run parameter is not provided")


class NPMIPlugin(base_plugin.TBPlugin):
    """nPMI Plugin for Tensorboard."""

    plugin_name = "npmi"

    def __init__(self, context):
        """Instantiates the nPMI Plugin via Tensorboard core.

        Args:
            context: A base_plugin.TBContext instance.
        """
        super(NPMIPlugin, self).__init__(context)
        self._logdir = context.logdir
        self._multiplexer = context.multiplexer

    def get_plugin_apps(self):
        return {
            "/tags": self.serve_tags,
            "/annotations": self.serve_annotations,
            "/metrics": self.serve_metrics,
            "/values": self.serve_values,
        }

    def is_active(self):
        """Determines whether this plugin is active.

        This plugin is only active if TensorBoard sampled any text summaries.

        Returns:
          Whether this plugin is active.
        """
        return False  # `list_plugins` as called by TB core suffices

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            is_ng_component=True, tab_name="npmi", disable_reload=True
        )

    def tags_impl(self):
        mapping = self._multiplexer.PluginRunToTagToContent(self.plugin_name)
        result = {run: {} for run in self._multiplexer.Runs()}
        for (run, tag_to_content) in six.iteritems(mapping):
            for tag in tag_to_content:
                summary_metadata = self._multiplexer.SummaryMetadata(run, tag)
                result[run][tag] = {
                    "table": summary_metadata.plugin_data.content.decode(
                        "utf-8"
                    )
                }
        contents = json.dumps(result, sort_keys=True)
        return contents

    def annotations_impl(self):
        mapping = self._multiplexer.PluginRunToTagToContent(self.plugin_name)
        result = {run: {} for run in self._multiplexer.Runs()}
        for (run, _) in six.iteritems(mapping):
            event = self._multiplexer.Tensors(run, "metric_annotations")[0]
            event_data = [
                tensor.decode("utf-8")
                for tensor in tensor_util.make_ndarray(event.tensor_proto)
            ]
            result[run] = {"annotations": event_data}
        contents = json.dumps(result)
        return contents

    def metrics_impl(self):
        mapping = self._multiplexer.PluginRunToTagToContent(self.plugin_name)
        result = {run: {} for run in self._multiplexer.Runs()}
        for (run, _) in six.iteritems(mapping):
            event = self._multiplexer.Tensors(run, "metric_classes")[0]
            event_data = [
                tensor.decode("utf-8")
                for tensor in tensor_util.make_ndarray(event.tensor_proto)
            ]
            result[run] = {"metrics": event_data}
        contents = json.dumps(result)
        return contents

    def values_impl(self):
        mapping = self._multiplexer.PluginRunToTagToContent(self.plugin_name)
        result = {run: {} for run in self._multiplexer.Runs()}
        for (run, _) in six.iteritems(mapping):
            event = self._multiplexer.Tensors(run, "metric_results")[0]
            event_data = tensor_util.make_ndarray(event.tensor_proto).tolist()
            result[run] = {"values": event_data}
        contents = json.dumps(result)
        # This is ugly, but there should never be a NaN string to break this
        contents = contents.replace("NaN", "null")
        return contents

    @wrappers.Request.application
    def serve_tags(self, request):
        contents = self.tags_impl()
        return http_util.Respond(request, contents, "application/json")

    @wrappers.Request.application
    def serve_annotations(self, request):
        contents = self.annotations_impl()
        return http_util.Respond(request, contents, "application/json")

    @wrappers.Request.application
    def serve_metrics(self, request):
        contents = self.metrics_impl()
        return http_util.Respond(request, contents, "application/json")

    @wrappers.Request.application
    def serve_values(self, request):
        contents = self.values_impl()
        return http_util.Respond(request, contents, "application/json")
