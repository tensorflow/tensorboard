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
"""A sample plugin to demonstrate reading scalars."""


import mimetypes
import os

from werkzeug import wrappers

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.scalar import metadata

_SCALAR_PLUGIN_NAME = metadata.PLUGIN_NAME
_PLUGIN_DIRECTORY_PATH_PART = "/data/plugin/example_raw_scalars/"


class ExampleRawScalarsPlugin(base_plugin.TBPlugin):
    """Raw summary example plugin for TensorBoard."""

    plugin_name = "example_raw_scalars"

    def __init__(self, context):
        """Instantiates ExampleRawScalarsPlugin.

        Args:
          context: A base_plugin.TBContext instance.
        """
        self._data_provider = context.data_provider

    def get_plugin_apps(self):
        return {
            "/scalars": self.scalars_route,
            "/tags": self._serve_tags,
            "/static/*": self._serve_static_file,
        }

    @wrappers.Request.application
    def _serve_tags(self, request):
        """Serves run to tag info.

        Frontend clients can use the Multiplexer's run+tag structure to request data
        for a specific run+tag. Responds with a map of the form:
        {runName: [tagName, tagName, ...]}
        """
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        run_tag_mapping = self._data_provider.list_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
        )
        run_info = {run: list(tags) for (run, tags) in run_tag_mapping.items()}

        return http_util.Respond(request, run_info, "application/json")

    @wrappers.Request.application
    def _serve_static_file(self, request):
        """Returns a resource file from the static asset directory.

        Requests from the frontend have a path in this form:
        /data/plugin/example_raw_scalars/static/foo
        This serves the appropriate asset: ./static/foo.

        Checks the normpath to guard against path traversal attacks.
        """
        static_path_part = request.path[len(_PLUGIN_DIRECTORY_PATH_PART) :]
        resource_name = os.path.normpath(
            os.path.join(*static_path_part.split("/"))
        )
        if not resource_name.startswith("static" + os.path.sep):
            return http_util.Respond(
                request, "Not found", "text/plain", code=404
            )

        resource_path = os.path.join(os.path.dirname(__file__), resource_name)
        with open(resource_path, "rb") as read_file:
            mimetype = mimetypes.guess_type(resource_path)[0]
            return http_util.Respond(
                request, read_file.read(), content_type=mimetype
            )

    def is_active(self):
        """Returns whether there is relevant data for the plugin to process.

        When there are no runs with scalar data, TensorBoard will hide the plugin
        from the main navigation bar.
        """
        return True

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(es_module_path="/static/index.js")

    def scalars_impl(self, ctx, experiment, tag, run):
        """Returns scalar data for the specified tag and run.

        For details on how to use tags and runs, see
        https://github.com/tensorflow/tensorboard#tags-giving-names-to-data

        Args:
          tag: string
          run: string

        Returns:
          A list of ScalarEvents - tuples containing 3 numbers describing entries in
          the data series.

        Raises:
          NotFoundError if there are no scalars data for provided `run` and
          `tag`.
        """
        all_scalars = self._data_provider.read_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
            downsample=5000,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )
        scalars = all_scalars.get(run, {}).get(tag, None)
        if scalars is None:
            raise errors.NotFoundError(
                "No scalar data for run=%r, tag=%r" % (run, tag)
            )
        return [(x.wall_time, x.step, x.value) for x in scalars]

    @wrappers.Request.application
    def scalars_route(self, request):
        """Given a tag and single run, return array of ScalarEvents."""
        tag = request.args.get("tag")
        run = request.args.get("run")
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        body = self.scalars_impl(ctx, experiment, tag, run)
        return http_util.Respond(request, body, "application/json")
