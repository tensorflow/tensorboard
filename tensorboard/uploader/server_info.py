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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from google.protobuf import message
import requests

from absl import logging
from tensorboard import version
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.uploader.proto import server_info_pb2


# Request timeout for communicating with remote server.
_REQUEST_TIMEOUT_SECONDS = 10


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


class CommunicationError(RuntimeError):
    """Raised upon failure to communicate with the server."""

    pass
