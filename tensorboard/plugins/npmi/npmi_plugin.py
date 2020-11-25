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

import six
import math
from werkzeug import wrappers

from tensorboard import plugin_util
from tensorboard.plugins import base_plugin
from tensorboard.backend import http_util
from tensorboard.data import provider

from tensorboard.plugins.npmi import metadata

_DEFAULT_DOWNSAMPLING = 1  # nPMI tensors per time series


def _error_response(request, error_message):
    return http_util.Respond(
        request, {"error": error_message}, "application/json", code=400,
    )


def _missing_run_error_response(request):
    return _error_response(request, "run parameter is not provided")


# Convert all NaNs in a multidimensional list to None
def convert_nan_none(arr):
    return [
        convert_nan_none(e)
        if isinstance(e, list)
        else None
        if math.isnan(e)
        else e
        for e in arr
    ]


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
            "/embeddings": self.serve_embeddings,
        }

    def is_active(self):
        """Determines whether this plugin is active.

        This plugin is only active if TensorBoard sampled any npmi summaries.

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
            result[run] = []
            for (tag, metadatum) in six.iteritems(tag_to_content):
                content = metadata.parse_plugin_metadata(
                    metadatum.plugin_content
                )
                result[run].append(tag)
        return result

    def annotations_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(
                tags=[metadata.ANNOTATIONS_TAG]
            ),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_annotations = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=[metadata.ANNOTATIONS_TAG]
                ),
                downsample=self._downsample_to,
            )
            annotations = all_annotations.get(run, {}).get(
                metadata.ANNOTATIONS_TAG, {}
            )
            event_data = [
                annotation.decode("utf-8")
                for annotation in annotations[0].numpy
            ]
            result[run] = event_data
        return result

    def metrics_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(tags=[metadata.METRICS_TAG]),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_metrics = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=[metadata.METRICS_TAG]
                ),
                downsample=self._downsample_to,
            )
            metrics = all_metrics.get(run, {}).get(metadata.METRICS_TAG, {})
            event_data = [metric.decode("utf-8") for metric in metrics[0].numpy]
            result[run] = event_data
        return result

    def values_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(tags=[metadata.VALUES_TAG]),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_values = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=[metadata.VALUES_TAG]
                ),
                downsample=self._downsample_to,
            )
            values = all_values.get(run, {}).get(metadata.VALUES_TAG, {})
            event_data = values[0].numpy.tolist()
            event_data = convert_nan_none(event_data)
            result[run] = event_data
        return result

    def embeddings_impl(self, ctx, experiment):
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=self.plugin_name,
            run_tag_filter=provider.RunTagFilter(
                tags=[metadata.EMBEDDINGS_TAG]
            ),
        )
        result = {run: {} for run in mapping}
        for (run, _) in six.iteritems(mapping):
            all_embeddings = self._data_provider.read_tensors(
                ctx,
                experiment_id=experiment,
                plugin_name=self.plugin_name,
                run_tag_filter=provider.RunTagFilter(
                    runs=[run], tags=[metadata.EMBEDDINGS_TAG]
                ),
                downsample=self._downsample_to,
            )
            embeddings = all_embeddings.get(run, {}).get(
                metadata.EMBEDDINGS_TAG, {}
            )
            event_data = embeddings[0].numpy.tolist()
            result[run] = event_data
        return result

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

    @wrappers.Request.application
    def serve_embeddings(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        contents = self.embeddings_impl(ctx, experiment=experiment)
        return http_util.Respond(request, contents, "application/json")
