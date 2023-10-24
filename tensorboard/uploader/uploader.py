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


import grpc

from tensorboard.uploader.proto import write_service_pb2
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging

# Minimum length of a logdir polling cycle in seconds. Shorter cycles will
# sleep to avoid spinning over the logdir, which isn't great for disks and can
# be expensive for network file systems.
_MIN_LOGDIR_POLL_INTERVAL_SECS = 5

# Age in seconds of last write after which an event file is considered inactive.
# TODO(@nfelt): consolidate with TensorBoard --reload_multifile default logic.
_EVENT_FILE_INACTIVE_SECS = 4000

# Maximum length of a base-128 varint as used to encode a 64-bit value
# (without the "msb of last byte is bit 63" optimization, to be
# compatible with protobuf and golang varints).
_MAX_VARINT64_LENGTH_BYTES = 10

logger = tb_logging.get_logger()


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
