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
"""Angular Version of Text Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from werkzeug import wrappers

from tensorboard import plugin_util
from tensorboard.util import tensor_util
from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.data import provider
from tensorboard.plugins.text import text_plugin
from tensorboard.plugins.text import metadata 

def create_event(wall_time, step, string_ndarray):
    return {
        "wall_time": wall_time,
        "step": step,
        "text": string_ndarray,
    }

class TextV2Plugin(text_plugin.TextPlugin):
    """Angular Text Plugin For Tensorboard"""
    
    plugin_name = "text_v2"
    
    def get_plugin_apps(self):
        apps = super(TextV2Plugin, self).get_plugin_apps()
        apps[text_plugin.TEXT_ROUTE] = self.text_route
        return apps
    def Frontend_Metadata(self):
        return base_plugin.FrontendMetadata(
            is_ng_component=True, tab_name="Text v2", disable_reload=False
        )
    def simple_text_impl(self, run, tag, experiment):
        if self._data_provider:
            all_text = self._data_provider.read_tensors(
                experiment_id=experiment,
                plugin_name=metadata.PLUGIN_NAME,
                downsample=self._downsample_to,
                run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
            )
            text = all_text.get(run, {}).get(tag, None)
            if text is None:
                return []
            return [create_event(d.wall_time, d.step, d.numpy) for d in text]
        try:    
            text_events = self._multiplexer.Tensors(run, tag)
        except KeyError:
            text_events = []
        return [
            create_event(
                e.wall_time, e.step, tensor_util.make_ndarray(e.tensor_proto)
            )
            for e in text_events
        ]
    @wrappers.Request.application
    def simple_text_route(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        tag = request.args.get("tag")
        response = self.text_impl(run, tag, experiment)
        return http_util.Respond(request, response, "application/json")
