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

import functools
import time

import grpc
import six

from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import peekable_iterator
from tensorboard.uploader import util
from tensorboard import data_compat
from tensorboard.backend.event_processing import directory_loader
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.backend.event_processing import io_wrapper
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util

# Minimum length of an upload cycle in seconds; shorter cycles will sleep to
# use up the rest of the time to avoid sending write RPCs too quickly.
_MIN_UPLOAD_CYCLE_DURATION_SECS = 5

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

  def __init__(self, writer_client, logdir, rate_limiter=None):
    """Constructs a TensorBoardUploader.

    Args:
      writer_client: a TensorBoardWriterService stub instance
      logdir: path of the log directory to upload
      rate_limiter: a `RateLimiter` to use to limit upload cycle frequency
    """
    self._api = writer_client
    self._logdir = logdir
    self._request_builder = None
    if rate_limiter is None:
      self._rate_limiter = util.RateLimiter(_MIN_UPLOAD_CYCLE_DURATION_SECS)
    else:
      self._rate_limiter = rate_limiter
    active_filter = lambda secs: secs + _EVENT_FILE_INACTIVE_SECS >= time.time()
    directory_loader_factory = functools.partial(
        directory_loader.DirectoryLoader,
        loader_factory=event_file_loader.TimestampedEventFileLoader,
        path_filter=io_wrapper.IsTensorFlowEventsFile,
        active_filter=active_filter)
    self._logdir_loader = logdir_loader.LogdirLoader(
        self._logdir, directory_loader_factory)

  def create_experiment(self):
    """Creates an Experiment for this upload session and returns the ID."""
    logger.info("Creating experiment")
    request = write_service_pb2.CreateExperimentRequest()
    response = grpc_util.call_with_retries(self._api.CreateExperiment, request)
    self._request_builder = _RequestBuilder(response.experiment_id)
    return response.experiment_id

  def start_uploading(self):
    """Blocks forever to continuously upload data from the logdir.

    Raises:
      RuntimeError: If `create_experiment` has not yet been called.
      ExperimentNotFoundError: If the experiment is deleted during the
        course of the upload.
    """
    if self._request_builder is None:
      raise RuntimeError(
          "Must call create_experiment() before start_uploading()")
    while True:
      self._upload_once()

  def _upload_once(self):
    """Runs one upload cycle, sending zero or more RPCs."""
    logger.info("Starting an upload cycle")
    self._rate_limiter.tick()

    sync_start_time = time.time()
    self._logdir_loader.synchronize_runs()
    sync_duration_secs = time.time() - sync_start_time
    logger.info("Logdir sync took %.3f seconds", sync_duration_secs)

    run_to_events = self._logdir_loader.get_run_events()
    first_request = True
    for request in self._request_builder.build_requests(run_to_events):
      if not first_request:
        self._rate_limiter.tick()
      first_request = False
      upload_start_time = time.time()
      request_bytes = request.ByteSize()
      logger.info("Trying request of %d bytes", request_bytes)
      self._upload(request)
      upload_duration_secs = time.time() - upload_start_time
      logger.info(
          "Upload for %d runs (%d bytes) took %.3f seconds",
          len(request.runs),
          request_bytes,
          upload_duration_secs)

  def _upload(self, request):
    try:
      # TODO(@nfelt): execute this RPC asynchronously.
      grpc_util.call_with_retries(self._api.WriteScalar, request)
    except grpc.RpcError as e:
      if e.code() == grpc.StatusCode.NOT_FOUND:
        raise ExperimentNotFoundError()
      logger.error("Upload call failed with error %s", e)


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


class ExperimentNotFoundError(RuntimeError):
  pass


class PermissionDeniedError(RuntimeError):
  pass


class _OutOfSpaceError(Exception):
  """Action could not proceed without overflowing request budget.

  This is a signaling exception (like `StopIteration`) used internally
  by `_RequestBuilder`; it does not mean that anything has gone wrong.
  """
  pass


class _RequestBuilder(object):
  """Helper class for building requests that fit under a size limit.

  This class is not threadsafe. Use external synchronization if calling
  its methods concurrently.
  """

  _NON_SCALAR_TIME_SERIES = object()  # sentinel

  def __init__(self, experiment_id):
    self._experiment_id = experiment_id
    # The request currently being populated.
    self._request = None  # type: write_service_pb2.WriteScalarRequest
    # A lower bound on the number of bytes that we may yet add to the
    # request.
    self._byte_budget = None  # type: int
    # Map from `(run_name, tag_name)` to `SummaryMetadata` if the time
    # series is a scalar time series, else to `_NON_SCALAR_TIME_SERIES`.
    self._tag_metadata = {}

  def _new_request(self):
    """Allocates a new request and refreshes the budget."""
    self._request = write_service_pb2.WriteScalarRequest()
    self._byte_budget = _MAX_REQUEST_LENGTH_BYTES
    self._request.experiment_id = self._experiment_id
    self._byte_budget -= self._request.ByteSize()
    if self._byte_budget < 0:
      raise RuntimeError("Byte budget too small for experiment ID")

  def build_requests(self, run_to_events):
    """Converts a stream of TF events to a stream of outgoing requests.

    Each yielded request will be at most `_MAX_REQUEST_LENGTH_BYTES`
    bytes long.

    Args:
      run_to_events: Mapping from run name to generator of `tf.Event`
        values, as returned by `LogdirLoader.get_run_events`.

    Yields:
      A finite stream of `WriteScalarRequest` objects.

    Raises:
      RuntimeError: If no progress can be made because even a single
      point is too large (say, due to a gigabyte-long tag name).
    """

    self._new_request()
    runs = {}  # cache: map from run name to `Run` proto in request
    tags = {}  # cache: map from `(run, tag)` to `Tag` proto in run in request
    work_items = peekable_iterator.PeekableIterator(
        self._run_values(run_to_events))

    while work_items.has_next():
      (run_name, event, orig_value) = work_items.peek()
      value = data_compat.migrate_value(orig_value)
      time_series_key = (run_name, value.tag)

      metadata = self._tag_metadata.get(time_series_key)
      if metadata is None:
        plugin_name = value.metadata.plugin_data.plugin_name
        if plugin_name == scalar_metadata.PLUGIN_NAME:
          metadata = value.metadata
        else:
          metadata = _RequestBuilder._NON_SCALAR_TIME_SERIES
        self._tag_metadata[time_series_key] = metadata
      if metadata is _RequestBuilder._NON_SCALAR_TIME_SERIES:
        next(work_items)
        continue
      try:
        run_proto = runs.get(run_name)
        if run_proto is None:
          run_proto = self._create_run(run_name)
          runs[run_name] = run_proto
        tag_proto = tags.get((run_name, value.tag))
        if tag_proto is None:
          tag_proto = self._create_tag(run_proto, value.tag, metadata)
          tags[(run_name, value.tag)] = tag_proto
        self._create_point(tag_proto, event, value)
        next(work_items)
      except _OutOfSpaceError:
        # Flush request and start a new one.
        request_to_emit = self._prune_request()
        if request_to_emit is None:
          raise RuntimeError("Could not make progress uploading data")
        self._new_request()
        runs.clear()
        tags.clear()
        yield request_to_emit

    final_request = self._prune_request()
    if final_request is not None:
      yield final_request

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

  def _prune_request(self):
    """Removes empty runs and tags from the active request.

    This does not refund `self._byte_budget`; it is assumed that the
    request will be emitted immediately, anyway.

    Returns:
      The active request, or `None` if after pruning the request
      contains no data.
    """
    request = self._request
    for (run_idx, run) in reversed(list(enumerate(request.runs))):
      for (tag_idx, tag) in reversed(list(enumerate(run.tags))):
        if not tag.points:
          del run.tags[tag_idx]
      if not run.tags:
        del self._request.runs[run_idx]
    if not request.runs:
      request = None
    return request

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
