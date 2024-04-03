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
import numpy as np

from tensorboard import errors
from tensorboard import test as tb_test
from tensorboard import context
from tensorboard.data import grpc_provider
from tensorboard.data import provider
from tensorboard.data.proto import data_provider_pb2
from tensorboard.data.proto import data_provider_pb2_grpc
from tensorboard.util import tensor_util


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

    def test_experiment_metadata_when_only_data_location_set(self):
        res = data_provider_pb2.GetExperimentResponse()
        self.stub.GetExperiment.return_value = res

        actual = self.provider.experiment_metadata(
            self.ctx, experiment_id="123"
        )
        self.assertEqual(actual, provider.ExperimentMetadata())

        req = data_provider_pb2.GetExperimentRequest()
        req.experiment_id = "123"
        self.stub.GetExperiment.assert_called_once_with(req)

    def test_experiment_metadata_with_partial_metadata(self):
        res = data_provider_pb2.GetExperimentResponse()
        res.name = "mnist"
        self.stub.GetExperiment.return_value = res

        actual = self.provider.experiment_metadata(
            self.ctx, experiment_id="123"
        )
        self.assertEqual(
            actual,
            provider.ExperimentMetadata(
                experiment_name="mnist",
                experiment_description="",
                creation_time=0,
            ),
        )

        req = data_provider_pb2.GetExperimentRequest()
        req.experiment_id = "123"
        self.stub.GetExperiment.assert_called_once_with(req)

    def test_experiment_metadata_with_creation_time(self):
        res = data_provider_pb2.GetExperimentResponse()
        res.name = "mnist"
        res.description = "big breakthroughs"
        res.creation_time.FromMilliseconds(1500)
        self.stub.GetExperiment.return_value = res

        actual = self.provider.experiment_metadata(
            self.ctx, experiment_id="123"
        )
        self.assertEqual(
            actual,
            provider.ExperimentMetadata(
                experiment_name="mnist",
                experiment_description="big breakthroughs",
                creation_time=1.5,
            ),
        )

        req = data_provider_pb2.GetExperimentRequest()
        req.experiment_id = "123"
        self.stub.GetExperiment.assert_called_once_with(req)

    def test_list_plugins(self):
        res = data_provider_pb2.ListPluginsResponse()
        res.plugins.add(name="scalars")
        res.plugins.add(name="images")
        res.plugins.add(name="text")
        self.stub.ListPlugins.return_value = res

        actual = self.provider.list_plugins(self.ctx, experiment_id="123")
        self.assertEqual(actual, ["scalars", "images", "text"])

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

    def test_read_last_scalars(self):
        tag1 = data_provider_pb2.ReadScalarsResponse.TagEntry(
            tag_name="tag1",
            data=data_provider_pb2.ScalarData(
                step=[10000], wall_time=[1234.0], value=[1]
            ),
        )
        tag2 = data_provider_pb2.ReadScalarsResponse.TagEntry(
            tag_name="tag2",
            data=data_provider_pb2.ScalarData(
                step=[10000], wall_time=[1235.0], value=[0.50]
            ),
        )
        run1 = data_provider_pb2.ReadScalarsResponse.RunEntry(
            run_name="run1", tags=[tag1]
        )
        run2 = data_provider_pb2.ReadScalarsResponse.RunEntry(
            run_name="run2", tags=[tag2]
        )
        res = data_provider_pb2.ReadScalarsResponse(runs=[run1, run2])
        self.stub.ReadScalars.return_value = res

        actual = self.provider.read_last_scalars(
            self.ctx,
            experiment_id="123",
            plugin_name="scalars",
            run_tag_filter=provider.RunTagFilter(
                runs=["train", "test", "nope"]
            ),
        )
        expected = {
            "run1": {
                "tag1": provider.ScalarDatum(
                    step=10000, wall_time=1234.0, value=1
                ),
            },
            "run2": {
                "tag2": provider.ScalarDatum(
                    step=10000, wall_time=1235.0, value=0.50
                ),
            },
        }

        self.assertEqual(actual, expected)

        expected_req = data_provider_pb2.ReadScalarsRequest(
            experiment_id="123",
            plugin_filter=data_provider_pb2.PluginFilter(plugin_name="scalars"),
            run_tag_filter=data_provider_pb2.RunTagFilter(
                runs=data_provider_pb2.RunFilter(
                    names=["nope", "test", "train"]  # sorted
                )
            ),
            downsample=data_provider_pb2.Downsample(num_points=1),
        )
        self.stub.ReadScalars.assert_called_once_with(expected_req)

    def test_list_tensors(self):
        res = data_provider_pb2.ListTensorsResponse()
        run1 = res.runs.add(run_name="val")
        tag11 = run1.tags.add(tag_name="weights")
        tag11.metadata.max_step = 7
        tag11.metadata.max_wall_time = 7.77
        tag11.metadata.summary_metadata.plugin_data.content = b"magic"
        tag11.metadata.summary_metadata.summary_description = "hey"
        tag12 = run1.tags.add(tag_name="other")
        tag12.metadata.max_step = 8
        tag12.metadata.max_wall_time = 8.88
        run2 = res.runs.add(run_name="test")
        tag21 = run2.tags.add(tag_name="weights")
        tag21.metadata.max_step = 9
        tag21.metadata.max_wall_time = 9.99
        self.stub.ListTensors.return_value = res

        actual = self.provider.list_tensors(
            self.ctx,
            experiment_id="123",
            plugin_name="histograms",
            run_tag_filter=provider.RunTagFilter(tags=["weights", "other"]),
        )
        expected = {
            "val": {
                "weights": provider.TensorTimeSeries(
                    max_step=7,
                    max_wall_time=7.77,
                    plugin_content=b"magic",
                    description="hey",
                    display_name="",
                ),
                "other": provider.TensorTimeSeries(
                    max_step=8,
                    max_wall_time=8.88,
                    plugin_content=b"",
                    description="",
                    display_name="",
                ),
            },
            "test": {
                "weights": provider.TensorTimeSeries(
                    max_step=9,
                    max_wall_time=9.99,
                    plugin_content=b"",
                    description="",
                    display_name="",
                ),
            },
        }
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ListTensorsRequest()
        req.experiment_id = "123"
        req.plugin_filter.plugin_name = "histograms"
        req.run_tag_filter.tags.names.extend(["other", "weights"])  # sorted
        self.stub.ListTensors.assert_called_once_with(req)

    def test_read_tensors(self):
        res = data_provider_pb2.ReadTensorsResponse()
        run = res.runs.add(run_name="test")
        tag = run.tags.add(tag_name="weights")
        tag.data.step.extend([0, 1, 2])
        tag.data.wall_time.extend([1234.0, 1235.0, 1236.0])
        tag.data.value.append(tensor_util.make_tensor_proto([0.0, 0.0, 42.0]))
        tag.data.value.append(tensor_util.make_tensor_proto([1.0, 1.0, 43.0]))
        tag.data.value.append(tensor_util.make_tensor_proto([2.0, 2.0, 44.0]))
        self.stub.ReadTensors.return_value = res

        actual = self.provider.read_tensors(
            self.ctx,
            experiment_id="123",
            plugin_name="histograms",
            run_tag_filter=provider.RunTagFilter(runs=["test", "nope"]),
            downsample=3,
        )
        expected = {
            "test": {
                "weights": [
                    provider.TensorDatum(
                        step=0,
                        wall_time=1234.0,
                        numpy=np.array([0.0, 0.0, 42.0]),
                    ),
                    provider.TensorDatum(
                        step=1,
                        wall_time=1235.0,
                        numpy=np.array([1.0, 1.0, 43.0]),
                    ),
                    provider.TensorDatum(
                        step=2,
                        wall_time=1236.0,
                        numpy=np.array([2.0, 2.0, 44.0]),
                    ),
                ],
            },
        }
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ReadTensorsRequest()
        req.experiment_id = "123"
        req.plugin_filter.plugin_name = "histograms"
        req.run_tag_filter.runs.names.extend(["nope", "test"])  # sorted
        req.downsample.num_points = 3
        self.stub.ReadTensors.assert_called_once_with(req)

    def test_list_blob_sequences(self):
        res = data_provider_pb2.ListBlobSequencesResponse()
        run1 = res.runs.add(run_name="train")
        tag11 = run1.tags.add(tag_name="input_image")
        tag11.metadata.max_step = 7
        tag11.metadata.max_wall_time = 7.77
        tag11.metadata.max_length = 3
        tag11.metadata.summary_metadata.plugin_data.content = b"PNG"
        tag11.metadata.summary_metadata.display_name = "Input image"
        tag11.metadata.summary_metadata.summary_description = "img"
        self.stub.ListBlobSequences.return_value = res

        actual = self.provider.list_blob_sequences(
            self.ctx,
            experiment_id="123",
            plugin_name="images",
            run_tag_filter=provider.RunTagFilter(runs=["val", "train"]),
        )
        expected = {
            "train": {
                "input_image": provider.BlobSequenceTimeSeries(
                    max_step=7,
                    max_wall_time=7.77,
                    max_length=3,
                    plugin_content=b"PNG",
                    description="img",
                    display_name="Input image",
                ),
            },
        }
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ListBlobSequencesRequest()
        req.experiment_id = "123"
        req.plugin_filter.plugin_name = "images"
        req.run_tag_filter.runs.names.extend(["train", "val"])  # sorted
        self.stub.ListBlobSequences.assert_called_once_with(req)

    def test_read_blob_sequences(self):
        res = data_provider_pb2.ReadBlobSequencesResponse()
        run = res.runs.add(run_name="test")
        tag = run.tags.add(tag_name="input_image")
        tag.data.step.extend([0, 1])
        tag.data.wall_time.extend([1234.0, 1235.0])
        seq0 = tag.data.values.add()
        seq0.blob_refs.add(blob_key="step0img0")
        seq0.blob_refs.add(blob_key="step0img1")
        seq1 = tag.data.values.add()
        seq1.blob_refs.add(blob_key="step1img0")
        self.stub.ReadBlobSequences.return_value = res

        actual = self.provider.read_blob_sequences(
            self.ctx,
            experiment_id="123",
            plugin_name="images",
            run_tag_filter=provider.RunTagFilter(runs=["test", "nope"]),
            downsample=4,
        )
        expected = {
            "test": {
                "input_image": [
                    provider.BlobSequenceDatum(
                        step=0,
                        wall_time=1234.0,
                        values=(
                            provider.BlobReference(blob_key="step0img0"),
                            provider.BlobReference(blob_key="step0img1"),
                        ),
                    ),
                    provider.BlobSequenceDatum(
                        step=1,
                        wall_time=1235.0,
                        values=(provider.BlobReference(blob_key="step1img0"),),
                    ),
                ],
            },
        }
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ReadBlobSequencesRequest()
        req.experiment_id = "123"
        req.plugin_filter.plugin_name = "images"
        req.run_tag_filter.runs.names.extend(["nope", "test"])  # sorted
        req.downsample.num_points = 4
        self.stub.ReadBlobSequences.assert_called_once_with(req)

    def test_read_blob(self):
        responses = [
            data_provider_pb2.ReadBlobResponse(data=b"hello wo"),
            data_provider_pb2.ReadBlobResponse(data=b"rld"),
        ]
        self.stub.ReadBlob.return_value = responses

        actual = self.provider.read_blob(self.ctx, blob_key="myblob")
        expected = b"hello world"
        self.assertEqual(actual, expected)

        req = data_provider_pb2.ReadBlobRequest()
        req.blob_key = "myblob"
        self.stub.ReadBlob.assert_called_once_with(req)

    def test_read_blob_error(self):
        def fake_handler(req):
            del req  # unused
            yield data_provider_pb2.ReadBlobResponse(data=b"hello wo"),
            raise _grpc_error(grpc.StatusCode.NOT_FOUND, "it ran away!")

        self.stub.ReadBlob.side_effect = fake_handler

        with self.assertRaisesRegex(errors.NotFoundError, "it ran away!"):
            self.provider.read_blob(self.ctx, blob_key="myblob")

    def test_rpc_error(self):
        # This error handling is implemented with a context manager used
        # for all the methods, so take `list_plugins` as representative.
        cases = [
            (grpc.StatusCode.INVALID_ARGUMENT, errors.InvalidArgumentError),
            (grpc.StatusCode.NOT_FOUND, errors.NotFoundError),
            (grpc.StatusCode.PERMISSION_DENIED, errors.PermissionDeniedError),
        ]
        for code, error_type in cases:
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
