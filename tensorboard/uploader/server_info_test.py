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


import errno
import os
import socket
from wsgiref import simple_server

from concurrent import futures
from werkzeug import wrappers

from tensorboard import test as tb_test
from tensorboard import version
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.uploader import server_info
from tensorboard.uploader.proto import server_info_pb2


class FetchServerInfoTest(tb_test.TestCase):
    """Tests for `fetch_server_info`."""

    def _start_server(self, app):
        """Starts a server and returns its origin ("http://localhost:PORT")."""
        (_, localhost) = _localhost()
        server_class = _make_ipv6_compatible_wsgi_server()
        server = simple_server.make_server(localhost, 0, app, server_class)
        executor = futures.ThreadPoolExecutor()
        future = executor.submit(server.serve_forever, poll_interval=0.01)

        def cleanup():
            server.shutdown()  # stop handling requests
            server.server_close()  # release port
            future.result(timeout=3)  # wait for server termination

        self.addCleanup(cleanup)
        if ":" in localhost and not localhost.startswith("["):
            # IPv6 IP address, probably "::1".
            localhost = "[%s]" % localhost
        return "http://%s:%d" % (localhost, server.server_port)

    def test_fetches_response(self):
        expected_result = server_info_pb2.ServerInfoResponse()
        expected_result.compatibility.verdict = server_info_pb2.VERDICT_OK
        expected_result.compatibility.details = "all clear"
        expected_result.api_server.endpoint = "api.example.com:443"
        expected_result.url_format.template = "http://localhost:8080/{{eid}}"
        expected_result.url_format.id_placeholder = "{{eid}}"

        @wrappers.Request.application
        def app(request):
            self.assertEqual(request.method, "POST")
            self.assertEqual(request.path, "/api/uploader")
            body = request.get_data()
            request_pb = server_info_pb2.ServerInfoRequest.FromString(body)
            self.assertEqual(request_pb.version, version.VERSION)
            self.assertEqual(request_pb.plugin_specification.upload_plugins, [])
            return wrappers.Response(expected_result.SerializeToString())

        origin = self._start_server(app)
        result = server_info.fetch_server_info(origin, [])
        self.assertEqual(result, expected_result)

    def test_fetches_with_plugins(self):
        @wrappers.Request.application
        def app(request):
            body = request.get_data()
            request_pb = server_info_pb2.ServerInfoRequest.FromString(body)
            self.assertEqual(request_pb.version, version.VERSION)
            self.assertEqual(
                request_pb.plugin_specification.upload_plugins,
                ["plugin1", "plugin2"],
            )
            return wrappers.Response(
                server_info_pb2.ServerInfoResponse().SerializeToString()
            )

        origin = self._start_server(app)
        result = server_info.fetch_server_info(origin, ["plugin1", "plugin2"])
        self.assertIsNotNone(result)

    def test_econnrefused(self):
        (family, localhost) = _localhost()
        s = socket.socket(family)
        s.bind((localhost, 0))
        self.addCleanup(s.close)
        port = s.getsockname()[1]
        with self.assertRaises(server_info.CommunicationError) as cm:
            server_info.fetch_server_info("http://localhost:%d" % port, [])
        msg = str(cm.exception)
        self.assertIn("Failed to connect to backend", msg)
        if os.name != "nt":
            self.assertIn(os.strerror(errno.ECONNREFUSED), msg)

    def test_non_ok_response(self):
        @wrappers.Request.application
        def app(request):
            del request  # unused
            return wrappers.Response(b"very sad", status="502 Bad Gateway")

        origin = self._start_server(app)
        with self.assertRaises(server_info.CommunicationError) as cm:
            server_info.fetch_server_info(origin, [])
        msg = str(cm.exception)
        self.assertIn("Non-OK status from backend (502 Bad Gateway)", msg)
        self.assertIn("very sad", msg)

    def test_corrupt_response(self):
        @wrappers.Request.application
        def app(request):
            del request  # unused
            return wrappers.Response(b"\x7a\x7ftruncated proto")

        origin = self._start_server(app)
        with self.assertRaises(server_info.CommunicationError) as cm:
            server_info.fetch_server_info(origin, [])
        msg = str(cm.exception)
        self.assertIn("Corrupt response from backend", msg)
        self.assertIn("truncated proto", msg)

    def test_user_agent(self):
        @wrappers.Request.application
        def app(request):
            result = server_info_pb2.ServerInfoResponse()
            result.compatibility.details = request.headers["User-Agent"]
            return wrappers.Response(result.SerializeToString())

        origin = self._start_server(app)
        result = server_info.fetch_server_info(origin, [])
        expected_user_agent = "tensorboard/%s" % version.VERSION
        self.assertEqual(result.compatibility.details, expected_user_agent)


class CreateServerInfoTest(tb_test.TestCase):
    """Tests for `create_server_info`."""

    def test_response(self):
        frontend = "http://localhost:8080"
        backend = "localhost:10000"
        result = server_info.create_server_info(frontend, backend, [])

        expected_compatibility = server_info_pb2.Compatibility()
        expected_compatibility.verdict = server_info_pb2.VERDICT_OK
        expected_compatibility.details = ""
        self.assertEqual(result.compatibility, expected_compatibility)

        expected_api_server = server_info_pb2.ApiServer()
        expected_api_server.endpoint = backend
        self.assertEqual(result.api_server, expected_api_server)

        url_format = result.url_format
        actual_url = url_format.template.replace(
            url_format.id_placeholder, "123"
        )
        expected_url = "http://localhost:8080/experiment/123/"
        self.assertEqual(actual_url, expected_url)

        self.assertEqual(result.plugin_control.allowed_plugins, [])

    def test_response_with_plugins(self):
        frontend = "http://localhost:8080"
        backend = "localhost:10000"
        result = server_info.create_server_info(
            frontend, backend, ["plugin1", "plugin2"]
        )

        self.assertEqual(
            result.plugin_control.allowed_plugins, ["plugin1", "plugin2"]
        )


class ExperimentUrlTest(tb_test.TestCase):
    """Tests for `experiment_url`."""

    def test(self):
        info = server_info_pb2.ServerInfoResponse()
        info.url_format.template = "https://unittest.tensorboard.dev/x/???"
        info.url_format.id_placeholder = "???"
        actual = server_info.experiment_url(info, "123")
        self.assertEqual(actual, "https://unittest.tensorboard.dev/x/123")


class AllowedPluginsTest(tb_test.TestCase):
    """Tests for `allowed_plugins`."""

    def test_old_server_no_plugins(self):
        info = server_info_pb2.ServerInfoResponse()
        actual = server_info.allowed_plugins(info)
        self.assertEqual(actual, frozenset([scalars_metadata.PLUGIN_NAME]))

    def test_provided_but_no_plugins(self):
        info = server_info_pb2.ServerInfoResponse()
        info.plugin_control.SetInParent()
        actual = server_info.allowed_plugins(info)
        self.assertEqual(actual, frozenset([]))

    def test_scalars_only(self):
        info = server_info_pb2.ServerInfoResponse()
        info.plugin_control.allowed_plugins.append(scalars_metadata.PLUGIN_NAME)
        actual = server_info.allowed_plugins(info)
        self.assertEqual(actual, frozenset([scalars_metadata.PLUGIN_NAME]))

    def test_more_plugins(self):
        info = server_info_pb2.ServerInfoResponse()
        info.plugin_control.allowed_plugins.append("foo")
        info.plugin_control.allowed_plugins.append("bar")
        info.plugin_control.allowed_plugins.append("foo")
        actual = server_info.allowed_plugins(info)
        self.assertEqual(actual, frozenset(["foo", "bar"]))


class UploadLimitsTest(tb_test.TestCase):
    """Tests for `upload_limits`."""

    def test_no_upload_limits_in_server_info(self):
        info = server_info_pb2.ServerInfoResponse()
        actual = server_info.upload_limits(info)

        expected = server_info_pb2.UploadLimits()
        expected.max_scalar_request_size = (
            server_info._DEFAULT_MAX_SCALAR_REQUEST_SIZE
        )
        expected.max_tensor_request_size = (
            server_info._DEFAULT_MAX_TENSOR_REQUEST_SIZE
        )
        expected.max_blob_request_size = (
            server_info._DEFAULT_MAX_BLOB_REQUEST_SIZE
        )
        expected.min_scalar_request_interval = (
            server_info._DEFAULT_MIN_SCALAR_REQUEST_INTERVAL
        )
        expected.min_tensor_request_interval = (
            server_info._DEFAULT_MIN_TENSOR_REQUEST_INTERVAL
        )
        expected.min_blob_request_interval = (
            server_info._DEFAULT_MIN_BLOB_REQUEST_INTERVAL
        )
        expected.max_blob_size = server_info._DEFAULT_MAX_BLOB_SIZE
        expected.max_tensor_point_size = (
            server_info._DEFAULT_MAX_TENSOR_POINT_SIZE
        )
        self.assertEqual(actual, expected)

    def test_upload_limits_from_server_info(self):
        info_upload_limits = server_info_pb2.UploadLimits()
        info_upload_limits.max_scalar_request_size = 1
        info_upload_limits.max_tensor_request_size = 2
        info_upload_limits.max_blob_request_size = 3
        info_upload_limits.min_scalar_request_interval = 4
        info_upload_limits.min_tensor_request_interval = 5
        info_upload_limits.min_blob_request_interval = 6
        info_upload_limits.max_blob_size = 7
        info_upload_limits.max_tensor_point_size = 8

        info = server_info_pb2.ServerInfoResponse()
        info.upload_limits.CopyFrom(info_upload_limits)

        actual = server_info.upload_limits(info)
        self.assertEqual(actual, info_upload_limits)

    def test_missing_fields_in_upload_limits(self):
        info = server_info_pb2.ServerInfoResponse()
        info.upload_limits.max_blob_size = 22
        actual = server_info.upload_limits(info)

        expected = server_info_pb2.UploadLimits()
        expected.max_scalar_request_size = (
            server_info._DEFAULT_MAX_SCALAR_REQUEST_SIZE
        )
        expected.max_tensor_request_size = (
            server_info._DEFAULT_MAX_TENSOR_REQUEST_SIZE
        )
        expected.max_blob_request_size = (
            server_info._DEFAULT_MAX_BLOB_REQUEST_SIZE
        )
        expected.min_scalar_request_interval = (
            server_info._DEFAULT_MIN_SCALAR_REQUEST_INTERVAL
        )
        expected.min_tensor_request_interval = (
            server_info._DEFAULT_MIN_TENSOR_REQUEST_INTERVAL
        )
        expected.min_blob_request_interval = (
            server_info._DEFAULT_MIN_BLOB_REQUEST_INTERVAL
        )
        expected.max_blob_size = 22
        expected.max_tensor_point_size = (
            server_info._DEFAULT_MAX_TENSOR_POINT_SIZE
        )
        self.assertEqual(actual, expected)

    def test_missing_max_blob_size_in_upload_limits(self):
        # Test the one remaining field we did not test in
        # test_missing_fields_in_upload_limits.
        info = server_info_pb2.ServerInfoResponse()
        info.upload_limits.max_tensor_point_size = 22
        actual = server_info.upload_limits(info)

        self.assertEqual(
            actual.max_blob_size, server_info._DEFAULT_MAX_BLOB_SIZE
        )
        self.assertEqual(actual.max_tensor_point_size, 22)


def _localhost():
    """Gets family and nodename for a loopback address."""
    s = socket
    infos = s.getaddrinfo(
        None, 0, s.AF_UNSPEC, s.SOCK_STREAM, 0, s.AI_ADDRCONFIG
    )
    (family, _, _, _, address) = infos[0]
    nodename = address[0]
    return (family, nodename)


def _make_ipv6_compatible_wsgi_server():
    """Creates a `WSGIServer` subclass that works on IPv6-only machines."""
    address_family = _localhost()[0]
    attrs = {"address_family": address_family}
    bases = (simple_server.WSGIServer, object)  # `object` needed for py2
    return type("_Ipv6CompatibleWsgiServer", bases, attrs)


if __name__ == "__main__":
    tb_test.main()
