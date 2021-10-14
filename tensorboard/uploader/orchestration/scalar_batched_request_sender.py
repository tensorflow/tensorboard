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
"""Supports TensorBoard.dev uploader by batching WriteScalar gRPC requests."""

import contextlib
import grpc
import time
import uuid

from tensorboard.uploader.proto import write_service_pb2

from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util

logger = tb_logging.get_logger()

# How long to wait for a response on a scalar write request.
_SCALAR_WRITE_TIMEOUT_SECS = 30

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


class ScalarBatchedRequestSender(object):
    """Class for building `WriteScalarRequest`s that fit under a size limit.

    This class accumulates events into a sequence of requests, with
    multiple events batching into the same request, within a size limit.
    `add_event(...)` may or may not send the request (and start a new one).
    After all `add_event(...)` calls are complete, a final call to
    `flush()` is needed to send the final request.

    This class is not threadsafe. Use external synchronization if calling its
    methods concurrently.
    """

    def __init__(
        self,
        experiment_id,
        api,
        rpc_rate_limiter,
        max_request_size,
        tracker,
    ):
        if experiment_id is None:
            raise ValueError("experiment_id cannot be None")
        self._experiment_id = experiment_id
        self._api = api
        self._rpc_rate_limiter = rpc_rate_limiter
        self._byte_budget_manager = byte_budget_manager.ByteBudgetManager(
            max_request_size
        )
        self._tracker = tracker
        # map from uuid to grpc future.
        self._grpc_futures = {}

        self._runs = {}  # cache: map from run name to `Run` proto in request
        self._tags = (
            {}
        )  # cache: map from `(run, tag)` to `Tag` proto in run in request
        self._new_request()

    def _new_request(self):
        """Allocates a new request and refreshes the budget."""
        self._request = write_service_pb2.WriteScalarRequest()
        self._runs.clear()
        self._tags.clear()
        self._num_values = 0
        self._request.experiment_id = self._experiment_id
        self._byte_budget_manager.reset(self._request)

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
        self._create_point(tag_proto, event, value)
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
        self._groom_grpc_futures()

        with _request_logger(
            request, request.runs
        ), self._tracker.scalars_tracker(self._num_values):
            future_key = uuid.uuid4()
            print("initating retryable async %s" % future_key)
            future = grpc_util.async_call_with_retries(
                self._api.WriteScalar, request)
            self._grpc_futures[future_key]=future

        self._new_request()

    def _groom_grpc_futures(self):
        """Handle any excptions, remove completed futures."""
        done_futures = []
        # Check if any exceptions raised, collect indicies of futures which can
        # be removed.
        print('_groom_rpc_futures: there are %d futures:' % len(self._grpc_futures))
        for key, future in self._grpc_futures.items():
            print('   %s' % key)

        for key, future in self._grpc_futures.items():
            if not future.done():
                print('(-) %s still waiting.' % key)
            else:
                try:
                    print('(A) %s done() is true.' % key)
                    # We don't actually do anything with the results from the
                    # WriteScalar RPCs, but if we did, it would go here.  This
                    # call to result will raise any exception caused in the
                    # gRPC call.
                    future.result(_SCALAR_WRITE_TIMEOUT_SECS)
                    print('(B) %s got result.' % key)
                    done_futures.append(key)
                except grpc.RpcError as e:
                    print('(X) %s raised error.' % key)
                    if e.code() == grpc.StatusCode.NOT_FOUND:
                        raise uploader_errors.ExperimentNotFoundError()
                    logger.error("Upload call failed with error %s", e)
        # Remove all the completed futures.
        for key in done_futures:
            print('(C) %s removing tracking.' % key)
            del self._grpc_futures[key]
        print('_groom_rpc_futures done.')
        print('.')

    def complete_all_pending_futures(self):
        """Continuously checks the futures until they are done.

        This is guaranteed to complete if the underlying gRPC future
        requests are made with timeouts.
        """
        while self._grpc_futures:
            self._groom_grpc_futures()
            time.sleep(0.5)


    def _create_run(self, run_name):
        """Adds a run to the live request, if there's space.

        Args:
          run_name: String name of the run to add.

        Returns:
          The `WriteScalarRequest.Run` that was added to `request.runs`.

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
          run_proto: `WriteScalarRequest.Run` proto to which to add a tag.
          tag_name: String name of the tag to add (as `value.tag`).
          metadata: TensorBoard `SummaryMetadata` proto from the first
            occurrence of this time series.

        Returns:
          The `WriteScalarRequest.Tag` that was added to `run_proto.tags`.

        Raises:
          byte_budget_manager.OutOfSpaceError: If adding the tag would exceed
            the remaining request budget.
        """
        tag_proto = run_proto.tags.add(name=tag_name)
        tag_proto.metadata.CopyFrom(metadata)
        self._byte_budget_manager.add_tag(tag_proto)
        return tag_proto

    def _create_point(self, tag_proto, event, value):
        """Adds a scalar point to the given tag, if there's space.

        Args:
          tag_proto: `WriteScalarRequest.Tag` proto to which to add a point.
          event: Enclosing `Event` proto with the step and wall time data.
          value: Scalar `Summary.Value` proto with the actual scalar data.

        Raises:
          byte_budget_manager.OutOfSpaceError: If adding the point would exceed
            the remaining request budget.
        """
        point = tag_proto.points.add()
        point.step = event.step
        # TODO(@nfelt): skip tensor roundtrip for Value with simple_value set
        point.value = tensor_util.make_ndarray(value.tensor).item()
        util.set_timestamp(point.wall_time, event.wall_time)
        try:
            self._byte_budget_manager.add_point(point)
        except byte_budget_manager.OutOfSpaceError:
            tag_proto.points.pop()
            raise
        # Check if any exceptions raised.
