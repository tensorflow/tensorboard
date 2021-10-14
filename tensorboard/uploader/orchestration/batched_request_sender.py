# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Supports TensorBoard.dev uploader by batching WriteTensor gRPC requests."""

import contextlib
import grpc
import time

from tensorboard.compat.proto import graph_pb2
from tensorboard.uploader.proto import write_service_pb2
from google.protobuf import message
from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.uploader.orchestration import batched_request_sender
from tensorboard.uploader.orchestration import blob_request_sender
from tensorboard.uploader.orchestration import scalar_batched_request_sender
from tensorboard.uploader.orchestration import tensor_batched_request_sender
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.backend import process_graph
from tensorboard.compat.proto import types_pb2

def _filter_graph_defs(event):
    for v in event.summary.value:
        if v.metadata.plugin_data.plugin_name != graphs_metadata.PLUGIN_NAME:
            continue
        if v.tag == graphs_metadata.RUN_GRAPH_NAME:
            data = list(v.tensor.string_val)
            filtered_data = [_filtered_graph_bytes(x) for x in data]
            filtered_data = [x for x in filtered_data if x is not None]
            if filtered_data != data:
                new_tensor = tensor_util.make_tensor_proto(
                    filtered_data, dtype=types_pb2.DT_STRING
                )
                v.tensor.CopyFrom(new_tensor)

def _filtered_graph_bytes(graph_bytes):
    try:
        graph_def = graph_pb2.GraphDef().FromString(graph_bytes)
    # The reason for the RuntimeWarning catch here is b/27494216, whereby
    # some proto parsers incorrectly raise that instead of DecodeError
    # on certain kinds of malformed input. Triggering this seems to require
    # a combination of mysterious circumstances.
    except (message.DecodeError, RuntimeWarning):
        logger.warning(
            "Could not parse GraphDef of size %d. Skipping.",
            len(graph_bytes),
        )
        return None
    # Use the default filter parameters:
    # limit_attr_size=1024, large_attrs_key="_too_large_attrs"
    process_graph.prepare_graph_for_ui(graph_def)
    return graph_def.SerializeToString()

logger = tb_logging.get_logger()

class BatchedRequestSender(object):
    """Helper class for building requests that fit under a size limit.

    This class maintains stateful request builders for each of the possible
    request types (scalars, tensors, and blobs).  These accumulate batches
    independently, each maintaining its own byte budget and emitting a request
    when the batch becomes full.  As a consequence, events of different types
    will likely be sent to the backend out of order.  E.g., in the extreme case,
    a single tensor-flavored request may be sent only when the event stream is
    exhausted, even though many more recent scalar events were sent earlier.

    This class is not threadsafe. Use external synchronization if
    calling its methods concurrently.
    """

    def __init__(
        self,
        experiment_id,
        api,
        allowed_plugins,
        upload_limits,
        rpc_rate_limiter,
        tensor_rpc_rate_limiter,
        blob_rpc_rate_limiter,
        tracker,
    ):
        # Map from `(run_name, tag_name)` to `SummaryMetadata` if the time
        # series is a scalar time series, else to `_NON_SCALAR_TIME_SERIES`.
        self._tag_metadata = {}
        self._allowed_plugins = frozenset(allowed_plugins)
        self._tracker = tracker
        self._scalar_request_sender = scalar_batched_request_sender.ScalarBatchedRequestSender(
            experiment_id,
            api,
            rpc_rate_limiter,
            upload_limits.max_scalar_request_size,
            tracker=self._tracker,
        )
        self._tensor_request_sender = tensor_batched_request_sender.TensorBatchedRequestSender(
            experiment_id,
            api,
            tensor_rpc_rate_limiter,
            upload_limits.max_tensor_request_size,
            upload_limits.max_tensor_point_size,
            tracker=self._tracker,
        )
        self._blob_request_sender = blob_request_sender.BlobRequestSender(
            experiment_id,
            api,
            blob_rpc_rate_limiter,
            upload_limits.max_blob_request_size,
            upload_limits.max_blob_size,
            tracker=self._tracker,
        )
        self._tracker = tracker

    def send_requests(self, run_to_events):
        """Accepts a stream of TF events and sends batched write RPCs.

        Each sent request will be batched, the size of each batch depending on
        the type of data (Scalar vs Tensor vs Blob) being sent.

        Args:
          run_to_events: Mapping from run name to generator of `tf.Event`
            values, as returned by `LogdirLoader.get_run_events`.

        Raises:
          RuntimeError: If no progress can be made because even a single
          point is too large (say, due to a gigabyte-long tag name).
        """

        for (run_name, event, value) in self._run_values(run_to_events):
            time_series_key = (run_name, value.tag)

            # The metadata for a time series is memorized on the first event.
            # If later events arrive with a mismatching plugin_name, they are
            # ignored with a warning.
            metadata = self._tag_metadata.get(time_series_key)
            first_in_time_series = False
            if metadata is None:
                first_in_time_series = True
                metadata = value.metadata
                self._tag_metadata[time_series_key] = metadata

            plugin_name = metadata.plugin_data.plugin_name
            # TODO(cais): Call self._tracker.add_plugin_name() to track the
            # data for what plugins have been uploaded.
            if value.HasField("metadata") and (
                plugin_name != value.metadata.plugin_data.plugin_name
            ):
                logger.warning(
                    "Mismatching plugin names for %s.  Expected %s, found %s.",
                    time_series_key,
                    metadata.plugin_data.plugin_name,
                    value.metadata.plugin_data.plugin_name,
                )
                continue
            if plugin_name not in self._allowed_plugins:
                if first_in_time_series:
                    logger.info(
                        "Skipping time series %r with unsupported plugin name %r",
                        time_series_key,
                        plugin_name,
                    )
                continue

            if metadata.data_class == summary_pb2.DATA_CLASS_SCALAR:
                self._scalar_request_sender.add_event(
                    run_name, event, value, metadata
                )
            elif metadata.data_class == summary_pb2.DATA_CLASS_TENSOR:
                self._tensor_request_sender.add_event(
                    run_name, event, value, metadata
                )
            elif metadata.data_class == summary_pb2.DATA_CLASS_BLOB_SEQUENCE:
                self._blob_request_sender.add_event(
                    run_name, event, value, metadata
                )

        # Send requests corresponding to whatever remaining events.
        self._scalar_request_sender.flush()
        self._tensor_request_sender.flush()
        self._blob_request_sender.flush()
        # Wait for asynchronous calls to complete.
        self._scalar_request_sender.complete_all_pending_futures()


    def _run_values(self, run_to_events):
        """Helper generator to create a single stream of work items.

        Note that `dataclass_compat` may emit multiple variants of
        the same event, for backwards compatibility.  Thus this stream should
        be filtered to obtain the desired version of each event.  Here, we
        ignore any event that does not have a `summary` field.

        Furthermore, the events emitted here could contain values that do not
        have `metadata.data_class` set; these too should be ignored.  In
        `_send_summary_value(...)` above, we switch on `metadata.data_class`
        and drop any values with an unknown (i.e., absent or unrecognized)
        `data_class`.
        """
        # Note that this join in principle has deletion anomalies: if the input
        # stream contains runs with no events, or events with no values, we'll
        # lose that information. This is not a problem: we would need to prune
        # such data from the request anyway.
        for (run_name, events) in run_to_events.items():
            for event in events:
                _filter_graph_defs(event)
                for value in event.summary.value:
                    yield (run_name, event, value)
