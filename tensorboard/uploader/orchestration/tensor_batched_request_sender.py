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

from tensorboard.uploader.proto import write_service_pb2

from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util

logger = tb_logging.get_logger()


def _prune_empty_tags_and_runs(request):
    for (run_idx, run) in reversed(list(enumerate(request.runs))):
        for (tag_idx, tag) in reversed(list(enumerate(run.tags))):
            if not tag.points:
                del run.tags[tag_idx]
        if not run.tags:
            del request.runs[run_idx]


@contextlib.contextmanager
def _request_logger(request, runs=None):
    upload_start_time = time.time()
    request_bytes = request.ByteSize()
    logger.info("Trying request of %d bytes", request_bytes)
    yield
    upload_duration_secs = time.time() - upload_start_time
    if runs:
        logger.info(
            "Upload for %d runs (%d bytes) took %.3f seconds",
            len(runs),
            request_bytes,
            upload_duration_secs,
        )
    else:
        logger.info(
            "Upload of (%d bytes) took %.3f seconds",
            request_bytes,
            upload_duration_secs,
        )

class TensorBatchedRequestSender(object):
    """Class for building WriteTensor() requests that fit under a size limit.

    This class accumulates a current request.  `add_event(...)` may or may not
    send the request (and start a new one).  After all `add_event(...)` calls
    are complete, a final call to `flush()` is needed to send the final request.

    This class is not threadsafe. Use external synchronization if calling its
    methods concurrently.
    """

    def __init__(
        self,
        experiment_id,
        api,
        rpc_rate_limiter,
        max_request_size,
        max_tensor_point_size,
        tracker,
    ):
        if experiment_id is None:
            raise ValueError("experiment_id cannot be None")
        self._experiment_id = experiment_id
        self._api = api
        self._rpc_rate_limiter = rpc_rate_limiter
        self._byte_budget_manager = byte_budget_manager.ByteBudgetManager(
            max_request_size)
        self._max_tensor_point_size = max_tensor_point_size
        self._tracker = tracker

        self._runs = {}  # cache: map from run name to `Run` proto in request
        self._tags = (
            {}
        )  # cache: map from `(run, tag)` to `Tag` proto in run in request
        self._new_request()

    def _new_request(self):
        """Allocates a new request and refreshes the budget."""

        self._request = write_service_pb2.WriteTensorRequest()
        self._runs.clear()
        self._tags.clear()
        self._request.experiment_id = self._experiment_id
        self._byte_budget_manager.reset(self._request)
        self._num_values = 0
        self._num_values_skipped = 0
        self._tensor_bytes = 0
        self._tensor_bytes_skipped = 0

    def add_event(self, run_name, event, value, metadata):
        """Attempts to add the given event to the current request.

        If the event cannot be added to the current request because the byte
        budget is exhausted, the request is flushed, and the event is added
        to the next request.
        """
        try:
            self._add_event_internal(run_name, event, value, metadata)
        except byte_budget_manager.OutOfSpaceError:
            self.flush()
            # Try again.  This attempt should never produce OutOfSpaceError
            # because we just flushed.
            try:
                self._add_event_internal(run_name, event, value, metadata)
            except byte_budget_manager.OutOfSpaceError:
                raise RuntimeError("add_event failed despite flush")

    def _add_event_internal(self, run_name, event, value, metadata):
        run_proto = self._runs.get(run_name)
        if run_proto is None:
            run_proto = self._create_run(run_name)
            self._runs[run_name] = run_proto
        tag_proto = self._tags.get((run_name, value.tag))
        if tag_proto is None:
            tag_proto = self._create_tag(run_proto, value.tag, metadata)
            self._tags[(run_name, value.tag)] = tag_proto
        self._create_point(tag_proto, event, value, run_name)
        self._num_values += 1

    def flush(self):
        """Sends the active request after removing empty runs and tags.

        Starts a new, empty active request.
        """
        request = self._request
        _prune_empty_tags_and_runs(request)
        if not request.runs:
            return

        self._rpc_rate_limiter.tick()

        with _request_logger(request, request.runs):
            with self._tracker.tensors_tracker(
                self._num_values,
                self._num_values_skipped,
                self._tensor_bytes,
                self._tensor_bytes_skipped,
            ):
                try:
                    grpc_util.call_with_retries(self._api.WriteTensor, request)
                except grpc.RpcError as e:
                    if e.code() == grpc.StatusCode.NOT_FOUND:
                        raise uploader_errors.ExperimentNotFoundError()
                    logger.error("Upload call failed with error %s", e)

        self._new_request()

    def _create_run(self, run_name):
        """Adds a run to the live request, if there's space.

        Args:
          run_name: String name of the run to add.

        Returns:
          The `WriteTensorRequest.Run` that was added to `request.runs`.

        Raises:
          byte_budget_manager.OutOfSpaceError: If adding the run would exceed
            the remaining request budget.
        """
        run_proto = self._request.runs.add(name=run_name)
        self._byte_budget_manager.add_run(run_proto)
        return run_proto

    def _create_tag(self, run_proto, tag_name, metadata):
        """Adds a tag for the given value, if there's space.

        Args:
          run_proto: `WriteTensorRequest.Run` proto to which to add a tag.
          tag_name: String name of the tag to add (as `value.tag`).
          metadata: TensorBoard `SummaryMetadata` proto from the first
            occurrence of this time series.

        Returns:
          The `WriteTensorRequest.Tag` that was added to `run_proto.tags`.

        Raises:
          byte_budget_manager.OutOfSpaceError: If adding the tag would exceed
            the remaining request budget.
        """
        tag_proto = run_proto.tags.add(name=tag_name)
        tag_proto.metadata.CopyFrom(metadata)
        self._byte_budget_manager.add_tag(tag_proto)
        return tag_proto

    def _create_point(self, tag_proto, event, value, run_name):
        """Adds a tensor point to the given tag, if there's space.

        Args:
          tag_proto: `WriteTensorRequest.Tag` proto to which to add a point.
          event: Enclosing `Event` proto with the step and wall time data.
          value: Tensor `Summary.Value` proto with the actual tensor data.
          run_name: Name of the wrong, only used for error reporting.

        Raises:
          byte_budget_manager.OutOfSpaceError: If adding the point would exceed
            the remaining request budget.
        """
        point = tag_proto.points.add()
        point.step = event.step
        point.value.CopyFrom(value.tensor)
        util.set_timestamp(point.wall_time, event.wall_time)

        self._tensor_bytes += point.value.ByteSize()
        if point.value.ByteSize() > self._max_tensor_point_size:
            logger.warning(
                "Tensor (run:%s, tag:%s, step: %d) too large; skipping. "
                "Size %d exceeds limit of %d bytes.",
                run_name,
                tag_proto.name,
                event.step,
                point.value.ByteSize(),
                self._max_tensor_point_size,
            )
            tag_proto.points.pop()
            self._num_values_skipped += 1
            self._tensor_bytes_skipped += point.value.ByteSize()
            return

        self._validate_tensor_value(
            value.tensor, value.tag, event.step, event.wall_time
        )

        try:
            self._byte_budget_manager.add_point(point)
        except byte_budget_manager.OutOfSpaceError:
            tag_proto.points.pop()
            raise

    def _validate_tensor_value(self, tensor_proto, tag, step, wall_time):
        """Validate a TensorProto by attempting to parse it."""
        try:
            tensor_util.make_ndarray(tensor_proto)
        except ValueError as error:
            raise ValueError(
                "The uploader failed to upload a tensor. This seems to be "
                "due to a malformation in the tensor, which may be caused by "
                "a bug in the process that wrote the tensor.\n\n"
                "The tensor has tag '%s' and is at step %d and wall_time %.6f.\n\n"
                "Original error:\n%s" % (tag, step, wall_time, error)
            )

