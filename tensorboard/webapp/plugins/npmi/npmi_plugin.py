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
from werkzeug import wrappers
import werkzeug

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.util import tensor_util
from tensorboard.plugins import base_plugin
from tensorboard.backend import http_util
from tensorboard.data import provider

from tensorboard.webapp.plugins.npmi import safe_encoder
from tensorboard.webapp.plugins.npmi import metadata

_DEFAULT_DOWNSAMPLING = 1  # text tensors per time series


def _error_response(request, error_message):
    return http_util.Respond(
        request, {"error": error_message}, "application/json", code=400,
    )


def _missing_run_error_response(request):
    return _error_response(request, "run parameter is not provided")


class NpmiPlugin(base_plugin.TBPlugin):
    """nPMI Plugin for Tensorboard."""

    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        """Instantiates the nPMI Plugin via Tensorboard core.

        Args:
            context: A base_plugin.TBContext instance.
        """
        super(NpmiPlugin, self).__init__(context)
        self._logdir = context.logdir
        self._downsample_to = (context.sampling_hints or {}).get(
            self.plugin_name, _DEFAULT_DOWNSAMPLING
        )
        self._data_provider = context.data_provider

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

    def tags_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx, experiment_id=experiment, plugin_name=self.plugin_name
        )
        result = {run: {} for run in mapping}
        for (run, tag_to_content) in six.iteritems(mapping):
            for (tag, metadatum) in six.iteritems(tag_to_content):
                content = metadata.parse_plugin_metadata(
                    metadatum.plugin_content
                )
                result[run][tag] = {"table": content.title}
        contents = json.dumps(result, sort_keys=True)
        return contents

    def annotations_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(tags=["metric_annotations"]),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_annotations = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=["metric_annotations"]
                ),
                downsample=self._downsample_to,
            )
            annotations = all_annotations.get(run, {}).get(
                "metric_annotations", {}
            )
            event_data = [
                annotation.decode("utf-8")
                for annotation in annotations[0].numpy
            ]
            result[run] = event_data
        contents = json.dumps(result)
        return contents

    def metrics_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(tags=["metric_classes"]),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_metrics = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=["metric_classes"]
                ),
                downsample=self._downsample_to,
            )
            metrics = all_metrics.get(run, {}).get("metric_classes", {})
            event_data = [metric.decode("utf-8") for metric in metrics[0].numpy]
            result[run] = event_data
        contents = json.dumps(result)
        return contents

    def values_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(tags=["metric_results"]),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_values = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=["metric_results"]
                ),
                downsample=self._downsample_to,
            )
            values = all_values.get(run, {}).get("metric_results", {})
            event_data = values[0].numpy.tolist()
            result[run] = event_data
        contents = json.dumps(result, cls=safe_encoder.SafeEncoder)
        return contents

    @wrappers.Request.application
    def serve_tags(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        contents = self.tags_impl(ctx, experiment=experiment)
        return http_util.Respond(request, contents, "application/json")

    @wrappers.Request.application
    def serve_annotations(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        contents = self.annotations_impl(ctx, experiment=experiment)
        return http_util.Respond(request, contents, "application/json")

    @wrappers.Request.application
    def serve_metrics(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        contents = self.metrics_impl(ctx, experiment=experiment)
        return http_util.Respond(request, contents, "application/json")

    @wrappers.Request.application
    def serve_values(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        contents = self.values_impl(ctx, experiment=experiment)
        return http_util.Respond(request, contents, "application/json")
