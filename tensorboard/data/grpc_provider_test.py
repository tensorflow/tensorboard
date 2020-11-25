# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

from unittest import mock

import grpc
import grpc_testing

from tensorboard import errors
from tensorboard import test as tb_test
from tensorboard import context
from tensorboard.data import grpc_provider
from tensorboard.data import provider
from tensorboard.data.proto import data_provider_pb2
from tensorboard.data.proto import data_provider_pb2_grpc


def _create_mock_client():
    # Create a stub instance (using a test channel) in order to derive a mock
    # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
    # doesn't work with autospec because grpc constructs stubs via metaclassing.
    test_channel = grpc_testing.channel(
        service_descriptors=[], time=grpc_testing.strict_real_time()
    )
    stub = data_provider_pb2_grpc.TensorBoardDataProviderStub(test_channel)
    return mock.create_autospec(stub)


class GrpcDataProviderTest(tb_test.TestCase):
    def setUp(self):
        super().setUp()
        self.stub = _create_mock_client()
        addr = "localhost:0"  # invalid, just in case it tries to connect
        self.provider = grpc_provider.GrpcDataProvider(addr, self.stub)
        self.ctx = context.RequestContext()

    def test_data_location(self):
        actual = self.provider.data_location(self.ctx, experiment_id="123")
        self.assertEqual(actual, "grpc://localhost:0")

    def test_list_plugins(self):
        res = data_provider_pb2.ListPluginsResponse()
        res.plugins.add(name="scalars")
        res.plugins.add(name="images")
        self.stub.ListPlugins.return_value = res

        actual = self.provider.list_plugins(self.ctx, experiment_id="123")
        self.assertEqual(actual, ["scalars", "images"])

        req = data_provider_pb2.ListPluginsRequest()
        req.experiment_id = "123"
        self.stub.ListPlugins.assert_called_once_with(req)

    def test_list_runs(self):
        res = data_provider_pb2.ListRunsResponse()
        res.runs.add(name="val", start_time=1234.5)
        res.runs.add(name="test", start_time=6789.0)
        self.stub.ListRuns.return_value = res

        actual = self.provider.list_runs(self.ctx, experiment_id="123")
        expected = [
            provider.Run(run_id="val", run_name="val", start_time=1234.5),
            provider.Run(run_id="test", run_name="test", start_time=6789.0),
        ]
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ListRunsRequest()
        req.experiment_id = "123"
        self.stub.ListRuns.assert_called_once_with(req)

    def test_list_scalars(self):
        res = data_provider_pb2.ListScalarsResponse()
        run1 = res.runs.add(run_name="val")
        tag11 = run1.tags.add(tag_name="accuracy")
        tag11.metadata.max_step = 7
        tag11.metadata.max_wall_time = 7.77
        tag11.metadata.summary_metadata.plugin_data.content = b"magic"
        tag11.metadata.summary_metadata.display_name = "Accuracy"
        tag11.metadata.summary_metadata.summary_description = "hey"
        tag12 = run1.tags.add(tag_name="xent")
        tag12.metadata.max_step = 8
        tag12.metadata.max_wall_time = 8.88
        run2 = res.runs.add(run_name="test")
        tag21 = run2.tags.add(tag_name="accuracy")
        tag21.metadata.max_step = 9
        tag21.metadata.max_wall_time = 9.99
        self.stub.ListScalars.return_value = res

        actual = self.provider.list_scalars(
            self.ctx,
            experiment_id="123",
            plugin_name="scalars",
            run_tag_filter=provider.RunTagFilter(tags=["xent", "accuracy"]),
        )
        expected = {
            "val": {
                "accuracy": provider.ScalarTimeSeries(
                    max_step=7,
                    max_wall_time=7.77,
                    plugin_content=b"magic",
                    description="hey",
                    display_name="Accuracy",
                ),
                "xent": provider.ScalarTimeSeries(
                    max_step=8,
                    max_wall_time=8.88,
                    plugin_content=b"",
                    description="",
                    display_name="",
                ),
            },
            "test": {
                "accuracy": provider.ScalarTimeSeries(
                    max_step=9,
                    max_wall_time=9.99,
                    plugin_content=b"",
                    description="",
                    display_name="",
                ),
            },
        }
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ListScalarsRequest()
        req.experiment_id = "123"
        req.plugin_filter.plugin_name = "scalars"
        req.run_tag_filter.tags.names.extend(["accuracy", "xent"])  # sorted
        self.stub.ListScalars.assert_called_once_with(req)

    def test_read_scalars(self):
        res = data_provider_pb2.ReadScalarsResponse()
        run = res.runs.add(run_name="test")
        tag = run.tags.add(tag_name="accuracy")
        tag.data.step.extend([0, 1, 2, 4])
        tag.data.wall_time.extend([1234.0, 1235.0, 1236.0, 1237.0])
        tag.data.value.extend([0.25, 0.50, 0.75, 1.00])
        self.stub.ReadScalars.return_value = res

        actual = self.provider.read_scalars(
            self.ctx,
            experiment_id="123",
            plugin_name="scalars",
            run_tag_filter=provider.RunTagFilter(runs=["test", "nope"]),
            downsample=4,
        )
        expected = {
            "test": {
                "accuracy": [
                    provider.ScalarDatum(step=0, wall_time=1234.0, value=0.25),
                    provider.ScalarDatum(step=1, wall_time=1235.0, value=0.50),
                    provider.ScalarDatum(step=2, wall_time=1236.0, value=0.75),
                    provider.ScalarDatum(step=4, wall_time=1237.0, value=1.00),
                ],
            },
        }
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ReadScalarsRequest()
        req.experiment_id = "123"
        req.plugin_filter.plugin_name = "scalars"
        req.run_tag_filter.runs.names.extend(["nope", "test"])  # sorted
        req.downsample.num_points = 4
        self.stub.ReadScalars.assert_called_once_with(req)

    def test_rpc_error(self):
        # This error handling is implemented with a context manager used
        # for all the methods, so take `list_plugins` as representative.
        cases = [
            (grpc.StatusCode.INVALID_ARGUMENT, errors.InvalidArgumentError),
            (grpc.StatusCode.NOT_FOUND, errors.NotFoundError),
            (grpc.StatusCode.PERMISSION_DENIED, errors.PermissionDeniedError),
        ]
        for (code, error_type) in cases:
            with self.subTest(code.name):
                msg = "my favorite cause"
                e = _grpc_error(code, msg)
                self.stub.ListPlugins.side_effect = [e]
                with self.assertRaises(error_type) as cm:
                    self.provider.list_plugins(self.ctx, experiment_id="123")
                self.assertIn(msg, str(cm.exception))

        internal = grpc.StatusCode.INTERNAL
        with self.subTest(internal.name):
            e = _grpc_error(internal, "oops")
            self.stub.ListPlugins.side_effect = [e]
            with self.assertRaises(grpc.RpcError):
                self.provider.list_plugins(self.ctx, experiment_id="123")


def _grpc_error(code, details):
    # Monkey patch insertion for the methods a real grpc.RpcError would have.
    error = grpc.RpcError("RPC error %r: %s" % (code, details))
    error.code = lambda: code
    error.details = lambda: details
    return error


if __name__ == "__main__":
    tb_test.main()
