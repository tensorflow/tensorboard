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
"""The TensorBoard Scalars plugin.

See `http_api.md` in this directory for specifications of the routes for
this plugin.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import csv
import json

import six
from six import StringIO
from werkzeug import wrappers
import numpy as np

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.scalar import metadata
from tensorboard.util import tensor_util


_DEFAULT_DOWNSAMPLING = 1000  # scalars per time series


class OutputFormat(object):
    """An enum used to list the valid output formats for API calls."""

    JSON = "json"
    CSV = "csv"


class ScalarsPlugin(base_plugin.TBPlugin):
    """Scalars Plugin for TensorBoard."""

    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        """Instantiates ScalarsPlugin via TensorBoard core.

        Args:
          context: A base_plugin.TBContext instance.
        """
        self._downsample_to = (context.sampling_hints or {}).get(
            self.plugin_name, _DEFAULT_DOWNSAMPLING
        )
        self._data_provider = context.data_provider

    def get_plugin_apps(self):
        return {
            "/scalars": self.scalars_route,
            "/tags": self.tags_route,
            "/scalarsmulti": self.scalars_multirun_route,
        }

    def is_active(self):
        return False  # `list_plugins` as called by TB core suffices

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(element_name="tf-scalar-dashboard")

    def index_impl(self, ctx, experiment=None):
        """Return {runName: {tagName: {displayName: ..., description:
        ...}}}."""
        mapping = self._data_provider.list_scalars(
            ctx, experiment_id=experiment, plugin_name=metadata.PLUGIN_NAME,
        )
        result = {run: {} for run in mapping}
        for (run, tag_to_content) in six.iteritems(mapping):
            for (tag, metadatum) in six.iteritems(tag_to_content):
                description = plugin_util.markdown_to_safe_html(
                    metadatum.description
                )
                result[run][tag] = {
                    "displayName": metadatum.display_name,
                    "description": description,
                }
        return result

    def _scalars_impl(self, ctx, tag, run, experiment, output_format):
        """Result of the form `(body, mime_type)`."""
        all_scalars = self._data_provider.read_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
            downsample=self._downsample_to,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )
        scalars = all_scalars.get(run, {}).get(tag, None)
        if scalars is None:
            raise errors.NotFoundError(
                "No scalar data for run=%r, tag=%r" % (run, tag)
            )
        values = [(x.wall_time, x.step, x.value) for x in scalars]
        if output_format == OutputFormat.CSV:
            string_io = StringIO()
            writer = csv.writer(string_io)
            writer.writerow(["Wall time", "Step", "Value"])
            writer.writerows(values)
            return (string_io.getvalue(), "text/csv")
        else:
            return (values, "application/json")

    def _scalars_multirun_impl(self, ctx, tag, runs, experiment):
        """Result of the form `(body, mime_type)`."""
        all_scalars = self._data_provider.read_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
            downsample=self._downsample_to,
            run_tag_filter=provider.RunTagFilter(runs=runs, tags=[tag]),
        )
        result = {}
        for run in all_scalars:
            scalars = all_scalars.get(run, {}).get(tag, [])
            # Note we do not raise an error if data for a given run was not
            # found; we just return an empty array in that case.
            values = [(x.wall_time, x.step, x.value) for x in scalars]
            result[run] = values

        return (result, "application/json")

    @wrappers.Request.application
    def tags_route(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        index = self.index_impl(ctx, experiment=experiment)
        return http_util.Respond(request, index, "application/json")

    @wrappers.Request.application
    def scalars_route(self, request):
        """Given a tag and single run, return array of ScalarEvents."""
        if request.method == "GET":
            tag = request.args.get("tag")
            run = request.args.get("run")
        else:
            response = (
                "%s requests are forbidden by the scalars plugin."
                % request.method
            )
            return http_util.Respond(request, response, "text/plain", code=405)

        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        output_format = request.args.get("format")
        (body, mime_type) = self._scalars_impl(
            ctx, tag, run, experiment, output_format
        )
        return http_util.Respond(request, body, mime_type)

    @wrappers.Request.application
    def scalars_multirun_route(self, request):
        """Given a tag and runs, return dict of run to array of ScalarEvents."""
        if request.method == "POST":
            tag = request.form["tag"]
            json_runs = request.form["runs"]
            try:
                runs = json.loads(json_runs)
            except json.JSONDecodeError as e:
                raise errors.InvalidArgumentError(e)
        else:
            response = (
                "%s requests are forbidden by the scalars plugin."
                % request.method
            )
            return http_util.Respond(request, response, "text/plain", code=405)

        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        (body, mime_type) = self._scalars_multirun_impl(
            ctx, tag, runs, experiment
        )
        return http_util.Respond(request, body, mime_type)
