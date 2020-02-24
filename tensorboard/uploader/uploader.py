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
"""Uploads a TensorBoard logdir to TensorBoard.dev."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import functools
import time

import grpc
import six

from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import util
from tensorboard import data_compat
from tensorboard.backend.event_processing import directory_loader
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.backend.event_processing import io_wrapper
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util

# Minimum interval between initiating write RPCs.  When writes would otherwise
# happen more frequently, the process will sleep to use up the rest of the time.
_MIN_WRITE_RPC_INTERVAL_SECS = 5

# Age in seconds of last write after which an event file is considered inactive.
# TODO(@nfelt): consolidate with TensorBoard --reload_multifile default logic.
_EVENT_FILE_INACTIVE_SECS = 4000

# Maximum length of a base-128 varint as used to encode a 64-bit value
# (without the "msb of last byte is bit 63" optimization, to be
# compatible with protobuf and golang varints).
_MAX_VARINT64_LENGTH_BYTES = 10

# Maximum outgoing request size. The server-side limit is 4 MiB [1]; we
# should pad a bit to mitigate any errors in our bookkeeping. Currently,
# we pad a lot, because using higher request sizes causes occasional
# Deadline Exceeded errors in the RPC server.
#
# [1]: https://github.com/grpc/grpc/blob/e70d8582b4b0eedc45e3d25a57b58a08b94a9f4a/include/grpc/impl/codegen/grpc_types.h#L447  # pylint: disable=line-too-long
_MAX_REQUEST_LENGTH_BYTES = 1024 * 128

logger = tb_logging.get_logger()


class TensorBoardUploader(object):
    """Uploads a TensorBoard logdir to TensorBoard.dev."""

    def __init__(
        self,
        writer_client,
        logdir,
        rpc_rate_limiter=None,
        name=None,
        description=None,
    ):
        """Constructs a TensorBoardUploader.

        Args:
          writer_client: a TensorBoardWriterService stub instance
          logdir: path of the log directory to upload
          rpc_rate_limiter: a `RateLimiter` to use to limit write RPC frequency.
            Note this limit applies at the level of single RPCs in the Scalar
            and Tensor case, but at the level of an entire blob upload in the
            Blob case-- which may require a few preparatory RPCs and a stream
            of chunks.  Note the chunk stream is internally rate-limited by
            backpressure from the server, so it is not a concern that we do not
            explicitly rate-limit within the stream here.
          name: String name to assign to the experiment.
          description: String description to assign to the experiment.
        """
        self._api = writer_client
        self._logdir = logdir
        self._name = name
        self._description = description
        self._request_sender = None
        if rpc_rate_limiter is None:
            self._rpc_rate_limiter = util.RateLimiter(
                _MIN_WRITE_RPC_INTERVAL_SECS
            )
        else:
            self._rpc_rate_limiter = rpc_rate_limiter
        active_filter = (
            lambda secs: secs + _EVENT_FILE_INACTIVE_SECS >= time.time()
        )
        directory_loader_factory = functools.partial(
            directory_loader.DirectoryLoader,
            loader_factory=event_file_loader.TimestampedEventFileLoader,
            path_filter=io_wrapper.IsTensorFlowEventsFile,
            active_filter=active_filter,
        )
        self._logdir_loader = logdir_loader.LogdirLoader(
            self._logdir, directory_loader_factory
        )

    def create_experiment(self):
        """Creates an Experiment for this upload session and returns the ID."""
        logger.info("Creating experiment")
        request = write_service_pb2.CreateExperimentRequest(
            name=self._name, description=self._description
        )
        response = grpc_util.call_with_retries(
            self._api.CreateExperiment, request
        )
        self._request_sender = _BatchedRequestSender(
            response.experiment_id, self._api, self._rpc_rate_limiter
        )
        return response.experiment_id

    def start_uploading(self):
        """Blocks forever to continuously upload data from the logdir.

        Raises:
          RuntimeError: If `create_experiment` has not yet been called.
          ExperimentNotFoundError: If the experiment is deleted during the
            course of the upload.
        """
        if self._request_sender is None:
            raise RuntimeError(
                "Must call create_experiment() before start_uploading()"
            )
        while True:
            self._upload_once()

    def _upload_once(self):
        """Runs one upload cycle, sending zero or more RPCs."""
        logger.info("Starting an upload cycle")

        sync_start_time = time.time()
        self._logdir_loader.synchronize_runs()
        sync_duration_secs = time.time() - sync_start_time
        logger.info("Logdir sync took %.3f seconds", sync_duration_secs)

        run_to_events = self._logdir_loader.get_run_events()
        self._request_sender.send_requests(run_to_events)


def update_experiment_metadata(
    writer_client, experiment_id, name=None, description=None
):
    """Modifies user data associated with an experiment.

    Args:
      writer_client: a TensorBoardWriterService stub instance
      experiment_id: string ID of the experiment to modify
      name: If provided, modifies name of experiment to this value.
      description: If provided, modifies the description of the experiment to
         this value

    Raises:
      ExperimentNotFoundError: If no such experiment exists.
      PermissionDeniedError: If the user is not authorized to modify this
        experiment.
      InvalidArgumentError: If the server rejected the name or description, if,
        for instance, the size limits have changed on the server.
    """
    logger.info("Modifying experiment %r", experiment_id)
    request = write_service_pb2.UpdateExperimentRequest()
    request.experiment.experiment_id = experiment_id
    if name is not None:
        logger.info("Setting exp %r name to %r", experiment_id, name)
        request.experiment.name = name
        request.experiment_mask.name = True
    if description is not None:
        logger.info(
            "Setting exp %r description to %r", experiment_id, description
        )
        request.experiment.description = description
        request.experiment_mask.description = True
    try:
        grpc_util.call_with_retries(writer_client.UpdateExperiment, request)
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.NOT_FOUND:
            raise ExperimentNotFoundError()
        if e.code() == grpc.StatusCode.PERMISSION_DENIED:
            raise PermissionDeniedError()
        if e.code() == grpc.StatusCode.INVALID_ARGUMENT:
            raise InvalidArgumentError(e.details())
        raise


def delete_experiment(writer_client, experiment_id):
    """Permanently deletes an experiment and all of its contents.

    Args:
      writer_client: a TensorBoardWriterService stub instance
      experiment_id: string ID of the experiment to delete

    Raises:
      ExperimentNotFoundError: If no such experiment exists.
      PermissionDeniedError: If the user is not authorized to delete this
        experiment.
      RuntimeError: On unexpected failure.
    """
    logger.info("Deleting experiment %r", experiment_id)
    request = write_service_pb2.DeleteExperimentRequest()
    request.experiment_id = experiment_id
    try:
        grpc_util.call_with_retries(writer_client.DeleteExperiment, request)
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.NOT_FOUND:
            raise ExperimentNotFoundError()
        if e.code() == grpc.StatusCode.PERMISSION_DENIED:
            raise PermissionDeniedError()
        raise


class InvalidArgumentError(RuntimeError):
    pass


class ExperimentNotFoundError(RuntimeError):
    pass


class PermissionDeniedError(RuntimeError):
    pass


class _OutOfSpaceError(Exception):
    """Action could not proceed without overflowing request budget.

    This is a signaling exception (like `StopIteration`) used internally
    by `_*RequestSender`; it does not mean that anything has gone wrong.
    """

    pass


class _BatchedRequestSender(object):
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

    def __init__(self, experiment_id, api, rpc_rate_limiter):
        # Map from `(run_name, tag_name)` to `SummaryMetadata` if the time
        # series is a scalar time series, else to `_NON_SCALAR_TIME_SERIES`.
        self._tag_metadata = {}
        self._scalar_request_sender = _ScalarBatchedRequestSender(
            experiment_id, api, rpc_rate_limiter
        )

        # TODO(nielsene): add tensor case here
        # TODO(soergel): add blob case here

    def send_requests(self, run_to_events):
        """Accepts a stream of TF events and sends batched write RPCs.

        Each sent request will be at most `_MAX_REQUEST_LENGTH_BYTES`
        bytes long.

        Args:
          run_to_events: Mapping from run name to generator of `tf.Event`
            values, as returned by `LogdirLoader.get_run_events`.

        Raises:
          RuntimeError: If no progress can be made because even a single
          point is too large (say, due to a gigabyte-long tag name).
        """

        for (run_name, event, orig_value) in self._run_values(run_to_events):
            value = data_compat.migrate_value(orig_value)
            time_series_key = (run_name, value.tag)

            # The metadata for a time series is memorized on the first event.
            # If later events arrive with a mismatching plugin_name, they are
            # ignored with a warning.
            metadata = self._tag_metadata.get(time_series_key)
            if metadata is None:
                metadata = value.metadata
                self._tag_metadata[time_series_key] = metadata

            if value.HasField("metadata") and (
                value.metadata.plugin_data.plugin_name
                != metadata.plugin_data.plugin_name
            ):
                logger.warning(
                    "Mismatching plugin names for %s.  Expected %s, found %s.",
                    time_series_key,
                    metadata.plugin_data.plugin_name,
                    value.metadata.plugin_data.plugin_name,
                )
            elif (
                metadata.plugin_data.plugin_name == scalar_metadata.PLUGIN_NAME
            ):
                self._scalar_request_sender.add_event(
                    run_name, event, value, metadata
                )
            # TODO(nielsene): add Tensor plugin cases here
            # TODO(soergel): add Graphs blob case here

        self._scalar_request_sender.flush()
        # TODO(nielsene): add tensor case here
        # TODO(soergel): add blob case here

    def _run_values(self, run_to_events):
        """Helper generator to create a single stream of work items."""
        # Note that each of these joins in principle has deletion anomalies:
        # if the input stream contains runs with no events, or events with
        # no values, we'll lose that information. This is not a problem: we
        # would need to prune such data from the request anyway.
        for (run_name, events) in six.iteritems(run_to_events):
            for event in events:
                for value in event.summary.value:
                    yield (run_name, event, value)


class _ScalarBatchedRequestSender(object):
    """Helper class for building requests that fit under a size limit.

    This class accumulates a current request.  `add_event(...)` may or may not
    send the request (and start a new one).  After all `add_event(...)` calls
    are complete, a final call to `flush()` is needed to send the final request.

    This class is not threadsafe. Use external synchronization if calling its
    methods concurrently.
    """

    def __init__(self, experiment_id, api, rpc_rate_limiter):
        if experiment_id is None:
            raise ValueError("experiment_id cannot be None")
        self._experiment_id = experiment_id
        self._api = api
        self._rpc_rate_limiter = rpc_rate_limiter
        # A lower bound on the number of bytes that we may yet add to the
        # request.
        self._byte_budget = None  # type: int

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
        self._byte_budget = _MAX_REQUEST_LENGTH_BYTES
        self._request.experiment_id = self._experiment_id
        self._byte_budget -= self._request.ByteSize()
        if self._byte_budget < 0:
            raise RuntimeError("Byte budget too small for experiment ID")

    def add_event(self, run_name, event, value, metadata):
        """Attempts to add the given event to the current request.

        If the event cannot be added to the current request because the byte
        budget is exhausted, the request is flushed, and the event is added
        to the next request.
        """
        try:
            self._add_event_internal(run_name, event, value, metadata)
        except _OutOfSpaceError:
            self.flush()
            # Try again.  This attempt should never produce OutOfSpaceError
            # because we just flushed.
            try:
                self._add_event_internal(run_name, event, value, metadata)
            except _OutOfSpaceError:
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

    def flush(self):
        """Sends the active request after removing empty runs and tags.

        Starts a new, empty active request.
        """
        request = self._request
        for (run_idx, run) in reversed(list(enumerate(request.runs))):
            for (tag_idx, tag) in reversed(list(enumerate(run.tags))):
                if not tag.points:
                    del run.tags[tag_idx]
            if not run.tags:
                del request.runs[run_idx]
        if not request.runs:
            return

        self._rpc_rate_limiter.tick()

        with _request_logger(request):
            try:
                # TODO(@nfelt): execute this RPC asynchronously.
                grpc_util.call_with_retries(self._api.WriteScalar, request)
            except grpc.RpcError as e:
                if e.code() == grpc.StatusCode.NOT_FOUND:
                    raise ExperimentNotFoundError()
                logger.error("Upload call failed with error %s", e)

        self._new_request()

    def _create_run(self, run_name):
        """Adds a run to the live request, if there's space.

        Args:
          run_name: String name of the run to add.

        Returns:
          The `WriteScalarRequest.Run` that was added to `request.runs`.

        Raises:
          _OutOfSpaceError: If adding the run would exceed the remaining
            request budget.
        """
        run_proto = self._request.runs.add(name=run_name)
        # We can't calculate the proto key cost exactly ahead of time, as
        # it depends on the total size of all tags. Be conservative.
        cost = run_proto.ByteSize() + _MAX_VARINT64_LENGTH_BYTES + 1
        if cost > self._byte_budget:
            raise _OutOfSpaceError()
        self._byte_budget -= cost
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
          _OutOfSpaceError: If adding the tag would exceed the remaining
            request budget.
        """
        tag_proto = run_proto.tags.add(name=tag_name)
        tag_proto.metadata.CopyFrom(metadata)
        submessage_cost = tag_proto.ByteSize()
        # We can't calculate the proto key cost exactly ahead of time, as
        # it depends on the number of points. Be conservative.
        cost = submessage_cost + _MAX_VARINT64_LENGTH_BYTES + 1
        if cost > self._byte_budget:
            raise _OutOfSpaceError()
        self._byte_budget -= cost
        return tag_proto

    def _create_point(self, tag_proto, event, value):
        """Adds a scalar point to the given tag, if there's space.

        Args:
          tag_proto: `WriteScalarRequest.Tag` proto to which to add a point.
          event: Enclosing `Event` proto with the step and wall time data.
          value: Scalar `Summary.Value` proto with the actual scalar data.

        Returns:
          The `ScalarPoint` that was added to `tag_proto.points`.

        Raises:
          _OutOfSpaceError: If adding the point would exceed the remaining
            request budget.
        """
        point = tag_proto.points.add()
        point.step = event.step
        # TODO(@nfelt): skip tensor roundtrip for Value with simple_value set
        point.value = tensor_util.make_ndarray(value.tensor).item()
        util.set_timestamp(point.wall_time, event.wall_time)
        submessage_cost = point.ByteSize()
        cost = submessage_cost + _varint_cost(submessage_cost) + 1  # proto key
        if cost > self._byte_budget:
            tag_proto.points.pop()
            raise _OutOfSpaceError()
        self._byte_budget -= cost
        return point


@contextlib.contextmanager
def _request_logger(request):
    upload_start_time = time.time()
    request_bytes = request.ByteSize()
    logger.info("Trying request of %d bytes", request_bytes)
    yield
    upload_duration_secs = time.time() - upload_start_time
    logger.info(
        "Upload for %d runs (%d bytes) took %.3f seconds",
        len(request.runs),
        request_bytes,
        upload_duration_secs,
    )


def _varint_cost(n):
    """Computes the size of `n` encoded as an unsigned base-128 varint.

    This should be consistent with the proto wire format:
    <https://developers.google.com/protocol-buffers/docs/encoding#varints>

    Args:
      n: A non-negative integer.

    Returns:
      An integer number of bytes.
    """
    result = 1
    while n >= 128:
        result += 1
        n >>= 7
    return result
