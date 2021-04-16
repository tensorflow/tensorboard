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


import contextlib
import functools
import time

import grpc

from google.protobuf import message
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.compat.proto import types_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import upload_tracker
from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.uploader.orchestration import batched_request_sender
from tensorboard.uploader.orchestration import blob_request_sender
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.uploader.orchestration import scalar_batched_request_sender
from tensorboard.uploader.orchestration import tensor_batched_request_sender
from tensorboard.backend import process_graph
from tensorboard.backend.event_processing import directory_loader
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.backend.event_processing import io_wrapper
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util

# Minimum length of a logdir polling cycle in seconds. Shorter cycles will
# sleep to avoid spinning over the logdir, which isn't great for disks and can
# be expensive for network file systems.
_MIN_LOGDIR_POLL_INTERVAL_SECS = 5

# Age in seconds of last write after which an event file is considered inactive.
# TODO(@nfelt): consolidate with TensorBoard --reload_multifile default logic.
_EVENT_FILE_INACTIVE_SECS = 4000

logger = tb_logging.get_logger()


class TensorBoardUploader(object):
    """Uploads a TensorBoard logdir to TensorBoard.dev."""

    def __init__(
        self,
        writer_client,
        logdir,
        allowed_plugins,
        upload_limits,
        logdir_poll_rate_limiter=None,
        rpc_rate_limiter=None,
        tensor_rpc_rate_limiter=None,
        blob_rpc_rate_limiter=None,
        name=None,
        description=None,
        verbosity=None,
        one_shot=None,
    ):
        """Constructs a TensorBoardUploader.

        Args:
          writer_client: a TensorBoardWriterService stub instance
          logdir: path of the log directory to upload
          allowed_plugins: collection of string plugin names; events will only
            be uploaded if their time series's metadata specifies one of these
            plugin names
          upload_limits: instance of tensorboard.service.UploadLimits proto.
          logdir_poll_rate_limiter: a `RateLimiter` to use to limit logdir
            polling frequency, to avoid thrashing disks, especially on networked
            file systems
          rpc_rate_limiter: a `RateLimiter` to use to limit write RPC frequency.
            Note this limit applies at the level of single RPCs in the Scalar
            and Tensor case, but at the level of an entire blob upload in the
            Blob case-- which may require a few preparatory RPCs and a stream
            of chunks.  Note the chunk stream is internally rate-limited by
            backpressure from the server, so it is not a concern that we do not
            explicitly rate-limit within the stream here.
          name: String name to assign to the experiment.
          description: String description to assign to the experiment.
          verbosity: Level of verbosity, an integer. Supported value:
              0 - No upload statistics is printed.
              1 - Print upload statistics while uploading data (default).
         one_shot: Once uploading starts, upload only the existing data in
            the logdir and then return immediately, instead of the default
            behavior of continuing to listen for new data in the logdir and
            upload them when it appears.
        """
        self._api = writer_client
        self._logdir = logdir
        self._allowed_plugins = frozenset(allowed_plugins)
        self._upload_limits = upload_limits

        self._name = name
        self._description = description
        self._verbosity = 1 if verbosity is None else verbosity
        self._one_shot = False if one_shot is None else one_shot
        self._request_sender = None
        self._experiment_id = None
        if logdir_poll_rate_limiter is None:
            self._logdir_poll_rate_limiter = util.RateLimiter(
                _MIN_LOGDIR_POLL_INTERVAL_SECS
            )
        else:
            self._logdir_poll_rate_limiter = logdir_poll_rate_limiter

        if rpc_rate_limiter is None:
            self._rpc_rate_limiter = util.RateLimiter(
                self._upload_limits.min_scalar_request_interval / 1000
            )
        else:
            self._rpc_rate_limiter = rpc_rate_limiter

        if tensor_rpc_rate_limiter is None:
            self._tensor_rpc_rate_limiter = util.RateLimiter(
                self._upload_limits.min_tensor_request_interval / 1000
            )
        else:
            self._tensor_rpc_rate_limiter = tensor_rpc_rate_limiter

        if blob_rpc_rate_limiter is None:
            self._blob_rpc_rate_limiter = util.RateLimiter(
                self._upload_limits.min_blob_request_interval / 1000
            )
        else:
            self._blob_rpc_rate_limiter = blob_rpc_rate_limiter

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
        self._tracker = upload_tracker.UploadTracker(
            verbosity=self._verbosity, one_shot=self._one_shot
        )

    def has_data(self) -> bool:
        """Returns this object's upload tracker."""
        return self._tracker.has_data()

    @property
    def experiment_id(self) -> str:
        """Returns the experiment_id associated with this uploader.

        May be none if no experiment is set, for instance, if
        `create_experiment` has not been called.
        """
        return self._experiment_id

    def create_experiment(self):
        """Creates an Experiment for this upload session and returns the ID."""
        logger.info("Creating experiment")
        request = write_service_pb2.CreateExperimentRequest(
            name=self._name, description=self._description
        )
        response = grpc_util.call_with_retries(
            self._api.CreateExperiment, request
        )
        self._request_sender = batched_request_sender.BatchedRequestSender(
            response.experiment_id,
            self._api,
            allowed_plugins=self._allowed_plugins,
            upload_limits=self._upload_limits,
            rpc_rate_limiter=self._rpc_rate_limiter,
            tensor_rpc_rate_limiter=self._tensor_rpc_rate_limiter,
            blob_rpc_rate_limiter=self._blob_rpc_rate_limiter,
            tracker=self._tracker,
        )
        self._experiment_id = response.experiment_id
        return response.experiment_id

    def start_uploading(self):
        """Uploads data from the logdir.

        This will continuously scan the logdir, uploading as data is added
        unless the uploader was built with the _one_shot option, in which
        case it will terminate after the first scan.

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
            self._logdir_poll_rate_limiter.tick()
            self._upload_once()
            if self._one_shot:
                break

    def _upload_once(self):
        """Runs one upload cycle, sending zero or more RPCs."""
        logger.info("Starting an upload cycle")

        sync_start_time = time.time()
        self._logdir_loader.synchronize_runs()
        sync_duration_secs = time.time() - sync_start_time
        logger.info("Logdir sync took %.3f seconds", sync_duration_secs)

        run_to_events = self._logdir_loader.get_run_events()
        with self._tracker.send_tracker():
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
            raise uploader_errors.ExperimentNotFoundError()
        if e.code() == grpc.StatusCode.PERMISSION_DENIED:
            raise uploader_errors.PermissionDeniedError()
        if e.code() == grpc.StatusCode.INVALID_ARGUMENT:
            raise uploader_errors.InvalidArgumentError(e.details())
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
            raise uploader_errors.ExperimentNotFoundError()
        if e.code() == grpc.StatusCode.PERMISSION_DENIED:
            raise uploader_errors.PermissionDeniedError()
        raise


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


def _prune_empty_tags_and_runs(request):
    for (run_idx, run) in reversed(list(enumerate(request.runs))):
        for (tag_idx, tag) in reversed(list(enumerate(run.tags))):
            if not tag.points:
                del run.tags[tag_idx]
        if not run.tags:
            del request.runs[run_idx]



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
