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
"""The TensorBoard Graphs plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import six
from werkzeug import wrappers

from tensorboard import plugin_util
from tensorboard import context
from tensorboard.backend import http_util
from tensorboard.backend import process_graph
from tensorboard.backend.event_processing import tag_types
from tensorboard.compat.proto import config_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.graph import graph_util
from tensorboard.plugins.graph import keras_util
from tensorboard.plugins.graph import metadata
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()

# The Summary API is implemented in TensorFlow because it uses TensorFlow internal APIs.
# As a result, this SummaryMetadata is a bit unconventional and uses non-public
# hardcoded name as the plugin name. Please refer to link below for the summary ops.
# https://github.com/tensorflow/tensorflow/blob/11f4ecb54708865ec757ca64e4805957b05d7570/tensorflow/python/ops/summary_ops_v2.py#L757
_PLUGIN_NAME_RUN_METADATA = "graph_run_metadata"
# https://github.com/tensorflow/tensorflow/blob/11f4ecb54708865ec757ca64e4805957b05d7570/tensorflow/python/ops/summary_ops_v2.py#L788
_PLUGIN_NAME_RUN_METADATA_WITH_GRAPH = "graph_run_metadata_graph"
# https://github.com/tensorflow/tensorflow/blob/565952cc2f17fdfd995e25171cf07be0f6f06180/tensorflow/python/ops/summary_ops_v2.py#L825
_PLUGIN_NAME_KERAS_MODEL = "graph_keras_model"


class GraphsPlugin(base_plugin.TBPlugin):
    """Graphs Plugin for TensorBoard."""

    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        """Instantiates GraphsPlugin via TensorBoard core.

        Args:
          context: A base_plugin.TBContext instance.
        """
        self._multiplexer = context.multiplexer
        if context.flags and context.flags.generic_data == "true":
            self._data_provider = context.data_provider
        else:
            self._data_provider = None

    def get_plugin_apps(self):
        return {
            "/graph": self.graph_route,
            "/info": self.info_route,
            "/run_metadata": self.run_metadata_route,
        }

    def is_active(self):
        """The graphs plugin is active iff any run has a graph or metadata."""
        if self._data_provider:
            return False  # `list_plugins` as called by TB core suffices

        empty_context = context.RequestContext()  # not used
        return bool(self.info_impl(empty_context))

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            element_name="tf-graph-dashboard",
            # TODO(@chihuahua): Reconcile this setting with Health Pills.
            disable_reload=True,
        )

    def info_impl(self, ctx, experiment=None):
        """Returns a dict of all runs and their data availabilities."""
        result = {}

        def add_row_item(run, tag=None):
            run_item = result.setdefault(
                run,
                {
                    "run": run,
                    "tags": {},
                    # A run-wide GraphDef of ops.
                    "run_graph": False,
                },
            )

            tag_item = None
            if tag:
                tag_item = run_item.get("tags").setdefault(
                    tag,
                    {
                        "tag": tag,
                        "conceptual_graph": False,
                        # A tagged GraphDef of ops.
                        "op_graph": False,
                        "profile": False,
                    },
                )
            return (run_item, tag_item)

        if self._data_provider:
            mapping = self._data_provider.list_blob_sequences(
                ctx, experiment_id=experiment, plugin_name=metadata.PLUGIN_NAME,
            )
            for (run_name, tag_to_time_series) in six.iteritems(mapping):
                for tag in tag_to_time_series:
                    if tag == metadata.RUN_GRAPH_NAME:
                        (run_item, _) = add_row_item(run_name, None)
                        run_item["run_graph"] = True
                    else:
                        (_, tag_item) = add_row_item(run_name, tag)
                        tag_item["op_graph"] = True
            return result

        mapping = self._multiplexer.PluginRunToTagToContent(
            _PLUGIN_NAME_RUN_METADATA_WITH_GRAPH
        )
        for run_name, tag_to_content in six.iteritems(mapping):
            for (tag, content) in six.iteritems(tag_to_content):
                # The Summary op is defined in TensorFlow and does not use a stringified proto
                # as a content of plugin data. It contains single string that denotes a version.
                # https://github.com/tensorflow/tensorflow/blob/11f4ecb54708865ec757ca64e4805957b05d7570/tensorflow/python/ops/summary_ops_v2.py#L789-L790
                if content != b"1":
                    logger.warning(
                        "Ignoring unrecognizable version of RunMetadata."
                    )
                    continue
                (_, tag_item) = add_row_item(run_name, tag)
                tag_item["op_graph"] = True

        # Tensors associated with plugin name _PLUGIN_NAME_RUN_METADATA contain
        # both op graph and profile information.
        mapping = self._multiplexer.PluginRunToTagToContent(
            _PLUGIN_NAME_RUN_METADATA
        )
        for run_name, tag_to_content in six.iteritems(mapping):
            for (tag, content) in six.iteritems(tag_to_content):
                if content != b"1":
                    logger.warning(
                        "Ignoring unrecognizable version of RunMetadata."
                    )
                    continue
                (_, tag_item) = add_row_item(run_name, tag)
                tag_item["profile"] = True
                tag_item["op_graph"] = True

        # Tensors associated with plugin name _PLUGIN_NAME_KERAS_MODEL contain
        # serialized Keras model in JSON format.
        mapping = self._multiplexer.PluginRunToTagToContent(
            _PLUGIN_NAME_KERAS_MODEL
        )
        for run_name, tag_to_content in six.iteritems(mapping):
            for (tag, content) in six.iteritems(tag_to_content):
                if content != b"1":
                    logger.warning(
                        "Ignoring unrecognizable version of RunMetadata."
                    )
                    continue
                (_, tag_item) = add_row_item(run_name, tag)
                tag_item["conceptual_graph"] = True

        for (run_name, run_data) in six.iteritems(self._multiplexer.Runs()):
            if run_data.get(tag_types.GRAPH):
                (run_item, _) = add_row_item(run_name, None)
                run_item["run_graph"] = True

        for (run_name, run_data) in six.iteritems(self._multiplexer.Runs()):
            if tag_types.RUN_METADATA in run_data:
                for tag in run_data[tag_types.RUN_METADATA]:
                    (_, tag_item) = add_row_item(run_name, tag)
                    tag_item["profile"] = True

        return result

    def graph_impl(
        self,
        ctx,
        run,
        tag,
        is_conceptual,
        experiment=None,
        limit_attr_size=None,
        large_attrs_key=None,
    ):
        """Result of the form `(body, mime_type)`, or `None` if no graph
        exists."""
        if self._data_provider:
            if tag is None:
                tag = metadata.RUN_GRAPH_NAME
            graph_blob_sequences = self._data_provider.read_blob_sequences(
                ctx,
                experiment_id=experiment,
                plugin_name=metadata.PLUGIN_NAME,
                run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
                downsample=1,
            )
            blob_datum_list = graph_blob_sequences.get(run, {}).get(tag, ())
            try:
                blob_ref = blob_datum_list[0].values[0]
            except IndexError:
                return None
            # Always use the blob_key approach for now, even if there is a direct url.
            graph_raw = self._data_provider.read_blob(
                ctx, blob_key=blob_ref.blob_key
            )
            # This method ultimately returns pbtxt, but we have to deserialize and
            # later reserialize this anyway, because a) this way we accept binary
            # protobufs too, and b) below we run `prepare_graph_for_ui` on the graph.
            graph = graph_pb2.GraphDef.FromString(graph_raw)

        elif is_conceptual:
            tensor_events = self._multiplexer.Tensors(run, tag)
            # Take the first event if there are multiple events written from different
            # steps.
            keras_model_config = json.loads(
                tensor_events[0].tensor_proto.string_val[0]
            )
            graph = keras_util.keras_model_to_graph_def(keras_model_config)

        elif tag:
            tensor_events = self._multiplexer.Tensors(run, tag)
            # Take the first event if there are multiple events written from different
            # steps.
            run_metadata = config_pb2.RunMetadata.FromString(
                tensor_events[0].tensor_proto.string_val[0]
            )
            graph = graph_pb2.GraphDef()

            for func_graph in run_metadata.function_graphs:
                graph_util.combine_graph_defs(
                    graph, func_graph.pre_optimization_graph
                )
        else:
            graph = self._multiplexer.Graph(run)

        # This next line might raise a ValueError if the limit parameters
        # are invalid (size is negative, size present but key absent, etc.).
        process_graph.prepare_graph_for_ui(
            graph, limit_attr_size, large_attrs_key
        )
        return (str(graph), "text/x-protobuf")  # pbtxt

    def run_metadata_impl(self, run, tag):
        """Result of the form `(body, mime_type)`, or `None` if no data
        exists."""
        if self._data_provider:
            # TODO(davidsoergel, wchargin): Consider plumbing run metadata through data providers.
            return None
        try:
            run_metadata = self._multiplexer.RunMetadata(run, tag)
        except ValueError:
            # TODO(stephanwlee): Should include whether FE is fetching for v1 or v2 RunMetadata
            # so we can remove this try/except.
            tensor_events = self._multiplexer.Tensors(run, tag)
            if tensor_events is None:
                return None
            # Take the first event if there are multiple events written from different
            # steps.
            run_metadata = config_pb2.RunMetadata.FromString(
                tensor_events[0].tensor_proto.string_val[0]
            )
        if run_metadata is None:
            return None
        return (str(run_metadata), "text/x-protobuf")  # pbtxt

    @wrappers.Request.application
    def info_route(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        info = self.info_impl(ctx, experiment)
        return http_util.Respond(request, info, "application/json")

    @wrappers.Request.application
    def graph_route(self, request):
        """Given a single run, return the graph definition in protobuf
        format."""
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        tag = request.args.get("tag")
        conceptual_arg = request.args.get("conceptual", False)
        is_conceptual = True if conceptual_arg == "true" else False

        if run is None:
            return http_util.Respond(
                request, 'query parameter "run" is required', "text/plain", 400
            )

        limit_attr_size = request.args.get("limit_attr_size", None)
        if limit_attr_size is not None:
            try:
                limit_attr_size = int(limit_attr_size)
            except ValueError:
                return http_util.Respond(
                    request,
                    "query parameter `limit_attr_size` must be an integer",
                    "text/plain",
                    400,
                )

        large_attrs_key = request.args.get("large_attrs_key", None)

        try:
            result = self.graph_impl(
                ctx,
                run,
                tag,
                is_conceptual,
                experiment,
                limit_attr_size,
                large_attrs_key,
            )
        except ValueError as e:
            return http_util.Respond(request, e.message, "text/plain", code=400)
        else:
            if result is not None:
                (
                    body,
                    mime_type,
                ) = result  # pylint: disable=unpacking-non-sequence
                return http_util.Respond(request, body, mime_type)
            else:
                return http_util.Respond(
                    request, "404 Not Found", "text/plain", code=404
                )

    @wrappers.Request.application
    def run_metadata_route(self, request):
        """Given a tag and a run, return the session.run() metadata."""
        tag = request.args.get("tag")
        run = request.args.get("run")
        if tag is None:
            return http_util.Respond(
                request, 'query parameter "tag" is required', "text/plain", 400
            )
        if run is None:
            return http_util.Respond(
                request, 'query parameter "run" is required', "text/plain", 400
            )
        result = self.run_metadata_impl(run, tag)
        if result is not None:
            (body, mime_type) = result  # pylint: disable=unpacking-non-sequence
            return http_util.Respond(request, body, mime_type)
        else:
            return http_util.Respond(
                request, "404 Not Found", "text/plain", code=404
            )
