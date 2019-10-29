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
"""Tests for tensorboard.uploader.server_info."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import errno
import os
import socket
from wsgiref import simple_server

from concurrent import futures
from werkzeug import wrappers

from tensorboard import test as tb_test
from tensorboard import version
from tensorboard.uploader import server_info
from tensorboard.uploader.proto import server_info_pb2


class FetchServerInfoTest(tb_test.TestCase):
  """Tests for `fetch_server_info`."""

  def _localhost(self):
    if socket.has_ipv6:
      return (socket.AF_INET6, "::1")
    else:
      return (socket.AF_INET, "127.0.0.1")

  def _start_server(self, app):
    """Starts a server and returns its origin ("http://localhost:PORT")."""
    (_, localhost) = self._localhost()
    server_class = _Ipv6CompatibleWsgiServer
    server = simple_server.make_server(localhost, 0, app, server_class)
    executor = futures.ThreadPoolExecutor()
    future = executor.submit(server.serve_forever, poll_interval=0.01)

    def cleanup():
      server.shutdown()  # stop handling requests
      server.server_close()  # release port
      future.result(timeout=3)  # wait for server termination

    self.addCleanup(cleanup)
    return "http://localhost:%d" % server.server_port

  def test_fetches_response(self):
    expected_result = server_info_pb2.ServerInfoResponse()
    expected_result.compatibility.verdict = server_info_pb2.VERDICT_OK
    expected_result.compatibility.details = "all clear"
    expected_result.api_server.endpoint = "api.example.com:443"
    expected_result.url_format.template = "http://localhost:8080/{{eid}}"
    expected_result.url_format.placeholder = "{{eid}}"

    @wrappers.BaseRequest.application
    def app(request):
      self.assertEqual(request.method, "POST")
      self.assertEqual(request.path, "/api/uploader")
      body = request.get_data()
      request_pb = server_info_pb2.ServerInfoRequest.FromString(body)
      self.assertEqual(request_pb.version, version.VERSION)
      return wrappers.BaseResponse(expected_result.SerializeToString())

    origin = self._start_server(app)
    result = server_info.fetch_server_info(origin)
    self.assertEqual(result, expected_result)

  def test_econnrefused(self):
    (family, localhost) = self._localhost()
    s = socket.socket(family)
    s.bind((localhost, 0))
    self.addCleanup(s.close)
    port = s.getsockname()[1]
    with self.assertRaises(server_info.CommunicationError) as cm:
      server_info.fetch_server_info("http://localhost:%d" % port)
    msg = str(cm.exception)
    self.assertIn("Failed to connect to backend", msg)
    if os.name != "nt":
      self.assertIn(os.strerror(errno.ECONNREFUSED), msg)

  def test_non_ok_response(self):
    @wrappers.BaseRequest.application
    def app(request):
      del request  # unused
      return wrappers.BaseResponse(b"very sad", status="502 Bad Gateway")

    origin = self._start_server(app)
    with self.assertRaises(server_info.CommunicationError) as cm:
      server_info.fetch_server_info(origin)
    msg = str(cm.exception)
    self.assertIn("Non-OK status from backend (502 Bad Gateway)", msg)
    self.assertIn("very sad", msg)

  def test_corrupt_response(self):
    @wrappers.BaseRequest.application
    def app(request):
      del request  # unused
      return wrappers.BaseResponse(b"an unlikely proto")

    origin = self._start_server(app)
    with self.assertRaises(server_info.CommunicationError) as cm:
      server_info.fetch_server_info(origin)
    msg = str(cm.exception)
    self.assertIn("Corrupt response from backend", msg)
    self.assertIn("an unlikely proto", msg)


class CreateServerInfoTest(tb_test.TestCase):
  """Tests for `create_server_info`."""

  def test(self):
    frontend = "http://localhost:8080"
    backend = "localhost:10000"
    result = server_info.create_server_info(frontend, backend)

    expected_compatibility = server_info_pb2.Compatibility()
    expected_compatibility.verdict = server_info_pb2.VERDICT_OK
    expected_compatibility.details = ""
    self.assertEqual(result.compatibility, expected_compatibility)

    expected_api_server = server_info_pb2.ApiServer()
    expected_api_server.endpoint = backend
    self.assertEqual(result.api_server, expected_api_server)

    url_format = result.url_format
    actual_url = url_format.template.replace(url_format.placeholder, "123")
    expected_url = "http://localhost:8080/experiment/123/"
    self.assertEqual(actual_url, expected_url)


class _Ipv6CompatibleWsgiServer(simple_server.WSGIServer):
  if socket.has_ipv6:
    address_family = socket.AF_INET6


if __name__ == "__main__":
  tb_test.main()
