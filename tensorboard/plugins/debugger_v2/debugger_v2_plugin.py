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
"""The TensorBoard Debugger V2 plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from werkzeug import wrappers

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger_v2 import debug_data_provider
from tensorboard.backend import http_util


def _error_response(request, error_message):
    return http_util.Respond(
        request, {"error": error_message}, "application/json", code=400,
    )


def _missing_run_error_response(request):
    return _error_response(request, "run parameter is not provided")


class DebuggerV2Plugin(base_plugin.TBPlugin):
    """Debugger V2 Plugin for TensorBoard."""

    plugin_name = debug_data_provider.PLUGIN_NAME

    def __init__(self, context):
        """Instantiates Debugger V2 Plugin via TensorBoard core.

        Args:
          context: A base_plugin.TBContext instance.
        """
        super(DebuggerV2Plugin, self).__init__(context)
        self._logdir = context.logdir
        # TODO(cais): Implement factory for DataProvider that takes into account
        # the settings.
        self._data_provider = debug_data_provider.LocalDebuggerV2DataProvider(
            self._logdir
        )

    def get_plugin_apps(self):
        # TODO(cais): Add routes as they are implemented.
        return {
            "/runs": self.serve_runs,
            "/alerts": self.serve_alerts,
            "/execution/digests": self.serve_execution_digests,
            "/execution/data": self.serve_execution_data,
            "/source_files/list": self.serve_source_files_list,
            "/source_files/file": self.serve_source_file,
            "/stack_frames/stack_frames": self.serve_stack_frames,
        }

    def is_active(self):
        """Check whether the Debugger V2 Plugin is always active.

        When no data in the tfdbg v2 format is available, a custom information
        screen is displayed to instruct the user on how to generate such data
        to be able to use the plugin.

        Returns:
          `True` if and only if data in tfdbg v2's DebugEvent format is available.
        """
        return bool(self._data_provider.list_runs(""))

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            is_ng_component=True, tab_name="Debugger V2", disable_reload=True
        )

    @wrappers.Request.application
    def serve_runs(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        runs = self._data_provider.list_runs(experiment)
        run_listing = dict()
        for run in runs:
            run_listing[run.run_id] = {"start_time": run.start_time}
        return http_util.Respond(request, run_listing, "application/json")

    @wrappers.Request.application
    def serve_alerts(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        if run is None:
            return _missing_run_error_response(request)
        begin = int(request.args.get("begin", "0"))
        end = int(request.args.get("end", "-1"))
        alert_type = request.args.get("alert_type", None)
        run_tag_filter = debug_data_provider.alerts_run_tag_filter(
            run, begin, end, alert_type=alert_type
        )
        blob_sequences = self._data_provider.read_blob_sequences(
            experiment, self.plugin_name, run_tag_filter=run_tag_filter
        )
        tag = next(iter(run_tag_filter.tags))
        try:
            return http_util.Respond(
                request,
                self._data_provider.read_blob(
                    blob_sequences[run][tag][0].blob_key
                ),
                "application/json",
            )
        except errors.InvalidArgumentError as e:
            return _error_response(request, str(e))

    @wrappers.Request.application
    def serve_execution_digests(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        if run is None:
            return _missing_run_error_response(request)
        begin = int(request.args.get("begin", "0"))
        end = int(request.args.get("end", "-1"))
        run_tag_filter = debug_data_provider.execution_digest_run_tag_filter(
            run, begin, end
        )
        blob_sequences = self._data_provider.read_blob_sequences(
            experiment, self.plugin_name, run_tag_filter=run_tag_filter
        )
        tag = next(iter(run_tag_filter.tags))
        try:
            return http_util.Respond(
                request,
                self._data_provider.read_blob(
                    blob_sequences[run][tag][0].blob_key
                ),
                "application/json",
            )
        except errors.InvalidArgumentError as e:
            return _error_response(request, str(e))

    @wrappers.Request.application
    def serve_execution_data(self, request):
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        if run is None:
            return _missing_run_error_response(request)
        begin = int(request.args.get("begin", "0"))
        end = int(request.args.get("end", "-1"))
        run_tag_filter = debug_data_provider.execution_data_run_tag_filter(
            run, begin, end
        )
        blob_sequences = self._data_provider.read_blob_sequences(
            experiment, self.plugin_name, run_tag_filter=run_tag_filter
        )
        tag = next(iter(run_tag_filter.tags))
        try:
            return http_util.Respond(
                request,
                self._data_provider.read_blob(
                    blob_sequences[run][tag][0].blob_key
                ),
                "application/json",
            )
        except errors.InvalidArgumentError as e:
            return _error_response(request, str(e))

    @wrappers.Request.application
    def serve_source_files_list(self, request):
        """Serves a list of all source files involved in the debugged program."""
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        if run is None:
            return _missing_run_error_response(request)
        run_tag_filter = debug_data_provider.source_file_list_run_tag_filter(
            run
        )
        blob_sequences = self._data_provider.read_blob_sequences(
            experiment, self.plugin_name, run_tag_filter=run_tag_filter
        )
        tag = next(iter(run_tag_filter.tags))
        return http_util.Respond(
            request,
            self._data_provider.read_blob(blob_sequences[run][tag][0].blob_key),
            "application/json",
        )

    @wrappers.Request.application
    def serve_source_file(self, request):
        """Serves the content of a given source file.

        The source file is referred to by the index in the list of all source
        files involved in the execution of the debugged program, which is
        available via the `serve_source_files_list()`  serving route.

        Args:
          request: HTTP request.

        Returns:
          Response to the request.
        """
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        if run is None:
            return _missing_run_error_response(request)
        index = request.args.get("index")
        # TOOD(cais): When the need arises, support serving a subset of a
        # source file's lines.
        if index is None:
            return _error_response(
                request, "index is not provided for source file content"
            )
        index = int(index)
        run_tag_filter = debug_data_provider.source_file_run_tag_filter(
            run, index
        )
        blob_sequences = self._data_provider.read_blob_sequences(
            experiment, self.plugin_name, run_tag_filter=run_tag_filter
        )
        tag = next(iter(run_tag_filter.tags))
        try:
            return http_util.Respond(
                request,
                self._data_provider.read_blob(
                    blob_sequences[run][tag][0].blob_key
                ),
                "application/json",
            )
        except errors.NotFoundError as e:
            return _error_response(request, str(e))

    @wrappers.Request.application
    def serve_stack_frames(self, request):
        """Serves the content of stack frames.

        The source frames being requested are referred to be UUIDs for each of
        them, separated by commas.

        Args:
          request: HTTP request.

        Returns:
          Response to the request.
        """
        experiment = plugin_util.experiment_id(request.environ)
        run = request.args.get("run")
        if run is None:
            return _missing_run_error_response(request)
        stack_frame_ids = request.args.get("stack_frame_ids")
        if stack_frame_ids is None:
            return _error_response(request, "Missing stack_frame_ids parameter")
        if not stack_frame_ids:
            return _error_response(request, "Empty stack_frame_ids parameter")
        stack_frame_ids = stack_frame_ids.split(",")
        run_tag_filter = debug_data_provider.stack_frames_run_tag_filter(
            run, stack_frame_ids
        )
        blob_sequences = self._data_provider.read_blob_sequences(
            experiment, self.plugin_name, run_tag_filter=run_tag_filter
        )
        tag = next(iter(run_tag_filter.tags))
        try:
            return http_util.Respond(
                request,
                self._data_provider.read_blob(
                    blob_sequences[run][tag][0].blob_key
                ),
                "application/json",
            )
        except errors.NotFoundError as e:
            return _error_response(request, str(e))
