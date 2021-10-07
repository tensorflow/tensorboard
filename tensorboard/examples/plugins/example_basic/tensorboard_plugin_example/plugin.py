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

from tensorboard.plugins import base_plugin
from tensorboard.util import tensor_util
from tensorboard import plugin_util
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
        # not sure abouot this
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
        return werkzeug.Response(
            contents, content_type="application/javascript"
        )

    @wrappers.Request.application
    def _serve_tags(self, request):
        # del request  # unused

        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)

        # mapping = self.multiplexer.PluginRunToTagToContent(
        #     metadata.PLUGIN_NAME
        # )
        # empty mapping
        mapping = self.data_provider.list_tensors(
            ctx, experiment_id=experiment, plugin_name=metadata.PLUGIN_NAME
        )

        print('mapping', mapping)
        #result = {run: {} for run in self.multiplexer.Runs()}
        result = {run: {} for run in mapping}
        for (run, tag_to_content) in mapping.items():
            for tag in tag_to_content:
                print('tag', tag)
                # not sure the replacement of SummaryMetadata yet
                # summary_metadata = self.multiplexer.SummaryMetadata(run, tag)
                # result[run][tag] = {
                #     "description": summary_metadata.summary_description,
                # }
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
        run_tag_filter = {'run': run, 'tag': tag}
        print('run_tag_filter', run_tag_filter)
        if run is None or tag is None:
            raise werkzeug.exceptions.BadRequest("Must specify run and tag")
        try:
            data = [
                tensor_util.make_ndarray(event.tensor_proto)
                .item()
                .decode("utf-8")
                for event in self.data_provider.list_tensors(run_tag_filter=run_tag_filter)
                # for event in self.data_provider.Tensors(run, tag)
            ]
        except KeyError:
            raise werkzeug.exceptions.BadRequest("Invalid run or tag")
        contents = json.dumps(data, sort_keys=True)
        return werkzeug.Response(contents, content_type="application/json")
