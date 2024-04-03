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


import json
import os

from tensorboard import plugin_util
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
import werkzeug
from werkzeug import wrappers

from tensorboard_plugin_example import metadata


class ExamplePlugin(base_plugin.TBPlugin):
    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        """Instantiates ExamplePlugin.

        Args:
        context: A base_plugin.TBContext instance.
        """
        self.data_provider = context.data_provider

    def is_active(self):
        """Returns whether there is relevant data for the plugin to process.

        When there are no runs with greeting data, TensorBoard will hide the
        plugin from the main navigation bar.
        """
        return False  # `list_plugins` as called by TB core suffices

    def get_plugin_apps(self):
        return {
            "/index.js": self._serve_js,
            "/tags": self._serve_tags,
            "/greetings": self._serve_greetings,
        }

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(es_module_path="/index.js")

    @wrappers.Request.application
    def _serve_js(self, request):
        del request  # unused
        filepath = os.path.join(os.path.dirname(__file__), "static", "index.js")
        with open(filepath) as infile:
            contents = infile.read()
        return werkzeug.Response(contents, content_type="text/javascript")

    @wrappers.Request.application
    def _serve_tags(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)

        mapping = self.data_provider.list_tensors(
            ctx, experiment_id=experiment, plugin_name=metadata.PLUGIN_NAME
        )

        result = {run: {} for run in mapping}
        for run, tag_to_timeseries in mapping.items():
            for tag, timeseries in tag_to_timeseries.items():
                result[run][tag] = {
                    "description": timeseries.description,
                }
        contents = json.dumps(result, sort_keys=True)
        return werkzeug.Response(contents, content_type="application/json")

    @wrappers.Request.application
    def _serve_greetings(self, request):
        """Serves greeting data for the specified tag and run.

        For details on how to use tags and runs, see
        https://github.com/tensorflow/tensorboard#tags-giving-names-to-data
        """
        run = request.args.get("run")
        tag = request.args.get("tag")
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)

        if run is None or tag is None:
            raise werkzeug.exceptions.BadRequest("Must specify run and tag")
        read_result = self.data_provider.read_tensors(
            ctx,
            downsample=1000,
            plugin_name=metadata.PLUGIN_NAME,
            experiment_id=experiment,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )

        data = read_result.get(run, {}).get(tag, [])
        if not data:
            raise werkzeug.exceptions.BadRequest("Invalid run or tag")
        event_data = [datum.numpy.item().decode("utf-8") for datum in data]

        contents = json.dumps(event_data, sort_keys=True)
        return werkzeug.Response(contents, content_type="application/json")
