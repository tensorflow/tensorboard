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
"""Initial server communication to determine session parameters."""


from google.protobuf import message
import requests

from absl import logging
from tensorboard import version
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.uploader.proto import server_info_pb2


# Request timeout for communicating with remote server.
_REQUEST_TIMEOUT_SECONDS = 10

# Minimum interval between initiating write WriteScalar RPCs, if not specified
# by server_info, in milliseconds
_DEFAULT_MIN_SCALAR_REQUEST_INTERVAL = 5000

# Minimum interval between initiating write WriteTensor RPCs, if not specified
# by server_info, in milliseconds.
_DEFAULT_MIN_TENSOR_REQUEST_INTERVAL = 1000

# Minimum interval between initiating blob write RPC streams, if not specified
# by server_info, in milliseconds.
# This may differ from the above RPC rate limits, because blob streams
# are not batched, so sending a sequence of N blobs requires N streams, which
# could reasonably be sent more frequently.
_DEFAULT_MIN_BLOB_REQUEST_INTERVAL = 1000

# Maximum WriteScalar request size, if not specified by server_info, in bytes.
# The server-side limit is 4 MiB [1]; we should pad a bit to mitigate any errors
# in our bookkeeping. Currently, we pad a lot because WriteScalar is relatively
# slow and we would otherwise risk Deadline Exceeded errors.
#
# [1]: https://github.com/grpc/grpc/blob/e70d8582b4b0eedc45e3d25a57b58a08b94a9f4a/include/grpc/impl/codegen/grpc_types.h#L447  # pylint: disable=line-too-long
_DEFAULT_MAX_SCALAR_REQUEST_SIZE = 128 * (2 ** 10)  # 128KiB

# Maximum WriteTensor request size, if not specified by server_info, in bytes.
# The server-side limit is 4 MiB [1]; we should pad a bit to mitigate any errors
# in our bookkeeping. Currently, we pad a lot.
#
# [1]: https://github.com/grpc/grpc/blob/e70d8582b4b0eedc45e3d25a57b58a08b94a9f4a/include/grpc/impl/codegen/grpc_types.h#L447  # pylint: disable=line-too-long
_DEFAULT_MAX_TENSOR_REQUEST_SIZE = 512 * (2 ** 10)  # 512KiB

# Maximum WriteBlob request size, if not specified by server_info, in bytes.
# The server-side limit is 4 MiB [1]; we pad with a 256 KiB chunk to mitigate
# any errors in our bookkeeping.
#
# [1]: https://github.com/grpc/grpc/blob/e70d8582b4b0eedc45e3d25a57b58a08b94a9f4a/include/grpc/impl/codegen/grpc_types.h#L447  # pylint: disable=line-too-long
_DEFAULT_MAX_BLOB_REQUEST_SIZE = 4 * (2 ** 20) - 256 * (2 ** 10)  # 4MiB-256KiB

# Maximum blob size, if not specified by server_info, in bytes.
_DEFAULT_MAX_BLOB_SIZE = 10 * (2 ** 20)  # 10MiB

# Maximum tensor point size, if not specified by server_info, in bytes.
_DEFAULT_MAX_TENSOR_POINT_SIZE = 16 * (2 ** 10)  # 16KiB


def _server_info_request(upload_plugins):
    """Generates a ServerInfoRequest

    Args:
      upload_plugins: List of plugin names requested by the user and to be
        verified by the server.

    Returns:
      A `server_info_pb2.ServerInfoRequest` message.
    """
    request = server_info_pb2.ServerInfoRequest()
    request.version = version.VERSION
    request.plugin_specification.upload_plugins[:] = upload_plugins
    return request


def fetch_server_info(origin, upload_plugins):
    """Fetches server info from a remote server.

    Args:
      origin: The server with which to communicate. Should be a string
        like "https://tensorboard.dev", including protocol, host, and (if
        needed) port.
      upload_plugins: List of plugins names requested by the user and to be
        verified by the server.

    Returns:
      A `server_info_pb2.ServerInfoResponse` message.

    Raises:
      CommunicationError: Upon failure to connect to or successfully
        communicate with the remote server.
    """
    endpoint = "%s/api/uploader" % origin
    server_info_request = _server_info_request(upload_plugins)
    post_body = server_info_request.SerializeToString()
    logging.info("Requested server info: <%r>", server_info_request)
    try:
        response = requests.post(
            endpoint,
            data=post_body,
            timeout=_REQUEST_TIMEOUT_SECONDS,
            headers={"User-Agent": "tensorboard/%s" % version.VERSION},
        )
    except requests.RequestException as e:
        raise CommunicationError("Failed to connect to backend: %s" % e)
    if not response.ok:
        raise CommunicationError(
            "Non-OK status from backend (%d %s): %r"
            % (response.status_code, response.reason, response.content)
        )
    try:
        return server_info_pb2.ServerInfoResponse.FromString(response.content)
    except message.DecodeError as e:
        raise CommunicationError(
            "Corrupt response from backend (%s): %r" % (e, response.content)
        )


def create_server_info(frontend_origin, api_endpoint, upload_plugins):
    """Manually creates server info given a frontend and backend.

    Args:
      frontend_origin: The origin of the TensorBoard.dev frontend, like
        "https://tensorboard.dev" or "http://localhost:8000".
      api_endpoint: As to `server_info_pb2.ApiServer.endpoint`.
      upload_plugins: List of plugin names requested by the user and to be
        verified by the server.

    Returns:
      A `server_info_pb2.ServerInfoResponse` message.
    """
    result = server_info_pb2.ServerInfoResponse()
    result.compatibility.verdict = server_info_pb2.VERDICT_OK
    result.api_server.endpoint = api_endpoint
    url_format = result.url_format
    placeholder = "{{EID}}"
    while placeholder in frontend_origin:
        placeholder = "{%s}" % placeholder
    url_format.template = "%s/experiment/%s/" % (frontend_origin, placeholder)
    url_format.id_placeholder = placeholder
    result.plugin_control.allowed_plugins[:] = upload_plugins
    return result


def experiment_url(server_info, experiment_id):
    """Formats a URL that will resolve to the provided experiment.

    Args:
      server_info: A `server_info_pb2.ServerInfoResponse` message.
      experiment_id: A string; the ID of the experiment to link to.

    Returns:
      A URL resolving to the given experiment, as a string.
    """
    url_format = server_info.url_format
    return url_format.template.replace(url_format.id_placeholder, experiment_id)


def allowed_plugins(server_info):
    """Determines which plugins may upload data.

    This pulls from the `plugin_control` on the `server_info` when that
    submessage is set, else falls back to a default.

    Args:
      server_info: A `server_info_pb2.ServerInfoResponse` message.

    Returns:
      A `frozenset` of plugin names.
    """
    if server_info.HasField("plugin_control"):
        return frozenset(server_info.plugin_control.allowed_plugins)
    else:
        # Old server: gracefully degrade to scalars only, which have
        # been supported since launch. TODO(@wchargin): Promote this
        # branch to an error once we're confident that we won't roll
        # back to old server versions.
        return frozenset((scalars_metadata.PLUGIN_NAME,))


def upload_limits(server_info):
    """Returns UploadLimits, from server_info if possible, otherwise from defaults.

    Args:
      server_info: A `server_info_pb2.ServerInfoResponse` message.

    Returns:
      An instance of UploadLimits.
    """
    if server_info.HasField("upload_limits"):
        upload_limits = server_info.upload_limits
    else:
        upload_limits = server_info_pb2.UploadLimits()

    if not upload_limits.max_scalar_request_size:
        upload_limits.max_scalar_request_size = _DEFAULT_MAX_SCALAR_REQUEST_SIZE
    if not upload_limits.max_tensor_request_size:
        upload_limits.max_tensor_request_size = _DEFAULT_MAX_TENSOR_REQUEST_SIZE
    if not upload_limits.max_blob_request_size:
        upload_limits.max_blob_request_size = _DEFAULT_MAX_BLOB_REQUEST_SIZE
    if not upload_limits.min_scalar_request_interval:
        upload_limits.min_scalar_request_interval = (
            _DEFAULT_MIN_SCALAR_REQUEST_INTERVAL
        )
    if not upload_limits.min_tensor_request_interval:
        upload_limits.min_tensor_request_interval = (
            _DEFAULT_MIN_TENSOR_REQUEST_INTERVAL
        )
    if not upload_limits.min_blob_request_interval:
        upload_limits.min_blob_request_interval = (
            _DEFAULT_MIN_BLOB_REQUEST_INTERVAL
        )
    if not upload_limits.max_blob_size:
        upload_limits.max_blob_size = _DEFAULT_MAX_BLOB_SIZE

    if not upload_limits.max_tensor_point_size:
        upload_limits.max_tensor_point_size = _DEFAULT_MAX_TENSOR_POINT_SIZE
    return upload_limits


class CommunicationError(RuntimeError):
    """Raised upon failure to communicate with the server."""

    pass
