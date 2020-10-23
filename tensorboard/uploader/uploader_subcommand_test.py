# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for tensorboard.uploader.uploader_subcommand."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import itertools
import os
import sys

import grpc_testing

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import

import tensorflow as tf

from tensorboard.uploader.proto import server_info_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import dry_run_stubs
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import uploader_subcommand
from tensorboard.uploader import server_info as server_info_lib
from tensorboard.plugins.histogram import metadata as histograms_metadata
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.scalar import metadata as scalars_metadata


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


# By default allow at least one plugin for each upload type: Scalar, Tensor, and
# Blobs.
_SCALARS_HISTOGRAMS_AND_GRAPHS = frozenset(
    (
        scalars_metadata.PLUGIN_NAME,
        histograms_metadata.PLUGIN_NAME,
        graphs_metadata.PLUGIN_NAME,
    )
)


class UploadIntentTest(tf.test.TestCase):
    def testUploadIntentUnderDryRunOneShot(self):
        """Test the upload intent under the dry-run + one-shot mode."""
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        upload_limits = server_info_pb2.UploadLimits(
            max_scalar_request_size=128000,
            max_tensor_request_size=128000,
            max_tensor_point_size=11111,
            max_blob_request_size=128000,
            max_blob_size=128000,
        )
        mock_stdout_write = mock.MagicMock()
        with mock.patch.object(
            server_info_lib,
            "allowed_plugins",
            return_value=_SCALARS_HISTOGRAMS_AND_GRAPHS,
        ), mock.patch.object(
            server_info_lib, "upload_limits", return_value=upload_limits
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            dry_run_stubs,
            "DryRunTensorBoardWriterStub",
            side_effect=dry_run_stubs.DryRunTensorBoardWriterStub,
        ) as mock_dry_run_stub:
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), dry_run=True, one_shot=True
            )
            intent.execute(mock_server_info, mock_channel)
        self.assertEqual(mock_dry_run_stub.call_count, 1)
        self.assertRegex(
            mock_stdout_write.call_args_list[-2][0][0],
            ".*Done scanning logdir.*",
        )
        self.assertEqual(
            mock_stdout_write.call_args_list[-1][0][0], "\nDone.\n"
        )

    def testUploadIntentWithExperimentUrlCallback(self):
        """Test the upload intent with a callback."""
        server_info = server_info_pb2.ServerInfoResponse()
        server_info.url_format.template = "https://tensorboard.dev/x/{}"
        server_info.url_format.id_placeholder = "{}"

        stub = dry_run_stubs.DryRunTensorBoardWriterStub()
        stub.CreateExperiment = lambda req, **__: write_service_pb2.CreateExperimentResponse(
            experiment_id="test_experiment_id", url="this URL is ignored"
        )

        expected_url = "https://tensorboard.dev/x/test_experiment_id"

        with mock.patch.object(
            dry_run_stubs, "DryRunTensorBoardWriterStub", wraps=lambda: stub,
        ), mock.patch.object(sys.stdout, "write"):
            mock_channel = mock.Mock()
            mock_experiment_url_callback = mock.Mock()
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(),
                dry_run=True,
                one_shot=True,
                experiment_url_callback=mock_experiment_url_callback,
            )
            intent.execute(server_info, mock_channel)
        mock_experiment_url_callback.assert_called_once_with(expected_url)

    def testUploadIntentDryRunNonOneShotInterrupted(self):
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        mock_stdout_write = mock.MagicMock()
        mock_uploader = mock.MagicMock()
        with mock.patch.object(
            mock_uploader, "start_uploading", side_effect=KeyboardInterrupt(),
        ), mock.patch.object(
            uploader_lib, "TensorBoardUploader", return_value=mock_uploader
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ):
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), dry_run=True, one_shot=False
            )
            intent.execute(mock_server_info, mock_channel)
        self.assertEqual(
            mock_stdout_write.call_args_list[-1][0][0], "\nInterrupted.\n"
        )

    def testUploadIntentNonDryRunNonOneShotInterrupted(self):
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        mock_stdout_write = mock.MagicMock()
        mock_uploader = mock.MagicMock()
        with mock.patch.object(
            mock_uploader, "start_uploading", side_effect=KeyboardInterrupt(),
        ), mock.patch.object(
            uploader_lib, "TensorBoardUploader", return_value=mock_uploader
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ):
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), dry_run=False, one_shot=False
            )
            intent.execute(mock_server_info, mock_channel)
        self.assertIn(
            "\nInterrupted. View your TensorBoard at ",
            mock_stdout_write.call_args_list[-1][0][0],
        )


if __name__ == "__main__":
    tf.test.main()
