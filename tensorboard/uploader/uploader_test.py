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
"""Tests for tensorboard.uploader.uploader."""


import itertools
from unittest import mock

import grpc
import grpc_testing

import tensorflow as tf

from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import test_util
from tensorboard.uploader import uploader as uploader_lib


def _create_mock_client():
    # Create a stub instance (using a test channel) in order to derive a mock
    # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
    # doesn't work with autospec because grpc constructs stubs via metaclassing.
    test_channel = grpc_testing.channel(
        service_descriptors=[], time=grpc_testing.strict_real_time()
    )
    stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
    mock_client = mock.create_autospec(stub)
    fake_exp_response = write_service_pb2.CreateExperimentResponse(
        experiment_id="123", url="should not be used!"
    )
    mock_client.CreateExperiment.return_value = fake_exp_response
    mock_client.GetOrCreateBlobSequence.side_effect = (
        write_service_pb2.GetOrCreateBlobSequenceResponse(
            blob_sequence_id="blob%d" % i
        )
        for i in itertools.count()
    )
    return mock_client


class DeleteExperimentTest(tf.test.TestCase):
    def _create_mock_client(self):
        # Create a stub instance (using a test channel) in order to derive a mock
        # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
        # doesn't work with autospec because grpc constructs stubs via metaclassing.
        test_channel = grpc_testing.channel(
            service_descriptors=[], time=grpc_testing.strict_real_time()
        )
        stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
        mock_client = mock.create_autospec(stub)
        return mock_client

    def test_success(self):
        mock_client = _create_mock_client()
        response = write_service_pb2.DeleteExperimentResponse()
        mock_client.DeleteExperiment.return_value = response

        uploader_lib.delete_experiment(mock_client, "123")

        expected_request = write_service_pb2.DeleteExperimentRequest()
        expected_request.experiment_id = "123"
        mock_client.DeleteExperiment.assert_called_once()
        (args, _) = mock_client.DeleteExperiment.call_args
        self.assertEqual(args[0], expected_request)

    def test_not_found(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            uploader_lib.delete_experiment(mock_client, "123")

    def test_unauthorized(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.PERMISSION_DENIED, "nope")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(uploader_lib.PermissionDeniedError):
            uploader_lib.delete_experiment(mock_client, "123")

    def test_internal_error(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.INTERNAL, "travesty")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(grpc.RpcError) as cm:
            uploader_lib.delete_experiment(mock_client, "123")
        msg = str(cm.exception)
        self.assertIn("travesty", msg)


class UpdateExperimentMetadataTest(tf.test.TestCase):
    def _create_mock_client(self):
        # Create a stub instance (using a test channel) in order to derive a mock
        # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
        # doesn't work with autospec because grpc constructs stubs via metaclassing.
        test_channel = grpc_testing.channel(
            service_descriptors=[], time=grpc_testing.strict_real_time()
        )
        stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
        mock_client = mock.create_autospec(stub)
        return mock_client

    def test_success(self):
        mock_client = _create_mock_client()
        new_name = "a new name"
        response = write_service_pb2.UpdateExperimentResponse()
        mock_client.UpdateExperiment.return_value = response

        uploader_lib.update_experiment_metadata(
            mock_client, "123", name=new_name
        )

        expected_request = write_service_pb2.UpdateExperimentRequest(
            experiment=experiment_pb2.Experiment(
                experiment_id="123", name=new_name
            ),
            experiment_mask=experiment_pb2.ExperimentMask(name=True),
        )
        mock_client.UpdateExperiment.assert_called_once()
        (args, _) = mock_client.UpdateExperiment.call_args
        self.assertEqual(args[0], expected_request)

    def test_not_found(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")

    def test_unauthorized(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.PERMISSION_DENIED, "nope")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_lib.PermissionDeniedError):
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")

    def test_invalid_argument(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(
            grpc.StatusCode.INVALID_ARGUMENT, "too many"
        )
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_lib.InvalidArgumentError) as cm:
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")
        msg = str(cm.exception)
        self.assertIn("too many", msg)

    def test_internal_error(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.INTERNAL, "travesty")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(grpc.RpcError) as cm:
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")
        msg = str(cm.exception)
        self.assertIn("travesty", msg)


if __name__ == "__main__":
    tf.test.main()
