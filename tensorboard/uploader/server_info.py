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

from tensorboard import version
from tensorboard.uploader.proto import server_info_pb2


# Request timeout for communicating with remote server.
_REQUEST_TIMEOUT_SECONDS = 10


def _server_info_request():
  request = server_info_pb2.ServerInfoRequest()
  request.version = version.VERSION
  return request


def fetch_server_info(origin):
  """Fetches server info from a remote server.

  Args:
    origin: The server with which to communicate. Should be a string
      like "https://tensorboard.dev", including protocol, host, and (if
      needed) port.

  Returns:
    A `server_info_pb2.ServerInfoResponse` message.

  Raises:
    CommunicationError: Upon failure to connect to or successfully
      communicate with the remote server.
  """
  endpoint = "%s/api/uploader" % origin
  post_body = _server_info_request().SerializeToString()
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


def create_server_info(frontend_origin, api_endpoint):
  """Manually creates server info given a frontend and backend.

  Args:
    frontend_origin: The origin of the TensorBoard.dev frontend, like
      "https://tensorboard.dev" or "http://localhost:8000".
    api_endpoint: As to `server_info_pb2.ApiServer.endpoint`.

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


class CommunicationError(RuntimeError):
  """Raised upon failure to communicate with the server."""

  pass
