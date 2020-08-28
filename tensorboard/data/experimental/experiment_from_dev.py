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
"""Experiment Data Access API for tensorboard.dev."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import sys
import time

import grpc
import numpy as np

from tensorboard.data.experimental import base_experiment
from tensorboard.uploader import auth
from tensorboard.uploader import util
from tensorboard.uploader import server_info as server_info_lib
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.uploader.proto import export_service_pb2_grpc
from tensorboard.uploader.proto import server_info_pb2
from tensorboard.util import grpc_util


DEFAULT_ORIGIN = "https://tensorboard.dev"


def import_pandas():
    """Import pandas, guarded by a user-friendly error message on failure."""
    try:
        import pandas
    except ImportError:
        raise ImportError(
            "The get_scalars() feature requires the pandas package, "
            "which does not seem to be available in your Python "
            "environment. You can install it with command:\n\n"
            "  pip install pandas\n"
        )
    return pandas


class ExperimentFromDev(base_experiment.BaseExperiment):
    """Implementation of BaseExperiment, specialized for tensorboard.dev."""

    def __init__(self, experiment_id, api_endpoint=None):
        """Constructor of ExperimentFromDev.

        Args:
          experiment_id: String ID of the experiment on tensorboard.dev (e.g.,
            "AdYd1TgeTlaLWXx6I8JUbA").
          api_endpoint: Optional override value for API endpoint. Used for
            development only.
        """
        super(ExperimentFromDev, self).__init__()
        self._experiment_id = experiment_id
        self._api_client = get_api_client(api_endpoint=api_endpoint)

    def get_scalars(
        self,
        runs_filter=None,
        tags_filter=None,
        pivot=False,
        include_wall_time=False,
    ):
        # NOTE(#3650): Import pandas early in this method, so if the
        # Python environment does not have pandas installed, an error can be
        # raised early, before any rpc call is made.
        pandas = import_pandas()
        if runs_filter is not None:
            raise NotImplementedError(
                "runs_filter support for get_scalars() is not implemented yet."
            )
        if tags_filter is not None:
            raise NotImplementedError(
                "tags_filter support for get_scalars() is not implemented yet."
            )

        request = export_service_pb2.StreamExperimentDataRequest()
        request.experiment_id = self._experiment_id
        read_time = time.time()
        util.set_timestamp(request.read_timestamp, read_time)
        # TODO(cais, wchargin): Use another rpc to check for staleness and avoid
        # a new StreamExperimentData rpc request if data is not stale.
        stream = self._api_client.StreamExperimentData(
            request, metadata=grpc_util.version_metadata()
        )

        runs = []
        tags = []
        steps = []
        wall_times = []
        values = []
        for response in stream:
            # TODO(cais, wchargin): Display progress bar during data loading.
            num_values = len(response.points.values)
            runs.extend([response.run_name] * num_values)
            tags.extend([response.tag_name] * num_values)
            steps.extend(list(response.points.steps))
            wall_times.extend(
                [t.ToNanoseconds() / 1e9 for t in response.points.wall_times]
            )
            values.extend(list(response.points.values))

        data = {
            "run": runs,
            "tag": tags,
            "step": steps,
            "value": values,
        }
        if include_wall_time:
            data["wall_time"] = wall_times
        dataframe = pandas.DataFrame(data)
        if pivot:
            dataframe = self._pivot_dataframe(dataframe)
        return dataframe

    def _pivot_dataframe(self, dataframe):
        num_missing_0 = np.count_nonzero(dataframe.isnull().values)
        dataframe = dataframe.pivot_table(
            values=(
                ["value", "wall_time"]
                if "wall_time" in dataframe.columns
                else "value"
            ),
            index=["run", "step"],
            columns="tag",
            dropna=False,
        )
        num_missing_1 = np.count_nonzero(dataframe.isnull().values)
        if num_missing_1 > num_missing_0:
            raise ValueError(
                "pivoted DataFrame contains missing value(s). "
                "This is likely due to two timeseries having different "
                "sets of steps in your experiment. "
                "You can avoid this error by calling `get_scalars()` with "
                "`pivot=False` to disable the DataFrame pivoting."
            )
        # `reset_index()` removes the MultiIndex structure of the pivoted
        # DataFrame. Before the call, the DataFrame consits of two levels
        # of index: "run" and "step". After the call, the index become a
        # single range index (e.g,. `dataframe[:2]` works).
        dataframe = dataframe.reset_index()
        # Remove the columns name "tag".
        dataframe.columns.name = None
        dataframe.columns.names = [None for name in dataframe.columns.names]
        return dataframe


def get_api_client(api_endpoint=None):
    server_info = _get_server_info(api_endpoint=api_endpoint)
    _handle_server_info(server_info)
    channel_creds = grpc.ssl_channel_credentials()
    credentials = auth.CredentialsStore().read_credentials()
    if credentials:
        channel_creds = grpc.composite_channel_credentials(
            channel_creds, auth.id_token_call_credentials(credentials)
        )
    channel = grpc.secure_channel(
        server_info.api_server.endpoint, channel_creds
    )
    return export_service_pb2_grpc.TensorBoardExporterServiceStub(channel)


def _get_server_info(api_endpoint=None):
    # TODO(cais): Add more plugins to the list when more plugin/data types
    # are supported
    plugins = ["scalars"]
    if api_endpoint:
        return server_info_lib.create_server_info(
            DEFAULT_ORIGIN, api_endpoint, plugins
        )
    return server_info_lib.fetch_server_info(DEFAULT_ORIGIN, plugins)


def _handle_server_info(info):
    compat = info.compatibility
    if compat.verdict == server_info_pb2.VERDICT_WARN:
        sys.stderr.write("Warning [from server]: %s\n" % compat.details)
        sys.stderr.flush()
    elif compat.verdict == server_info_pb2.VERDICT_ERROR:
        raise ValueError("Error [from server]: %s" % compat.details)
