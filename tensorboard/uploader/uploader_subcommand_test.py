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

import sys

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
from tensorboard.plugins.histogram import metadata as histograms_metadata
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.scalar import metadata as scalars_metadata


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
    def testUploadIntentOneShotEmptyDirectoryFails(self):
        """Test the upload intent under the one-shot mode with missing dir.

        In the case of a non-existent directoy, uploading should not
        create an experiment.
        """
        # Mock three places:
        # 1. The uploader itself, we will inspect invocations of its methods but
        #    do not want to actually uplaod anything.
        # 2. Writing to stdout, so we can inspect messages to the user.
        # 3. The creation of the grpc WriteServiceChannel, which happens in the
        #    non dry_run execution, but we don't want to actually open a network
        #    communication.
        mock_uploader = mock.MagicMock()
        mock_stdout_write = mock.MagicMock()
        with mock.patch.object(
            uploader_lib, "TensorBoardUploader", return_value=mock_uploader,
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            write_service_pb2_grpc, "TensorBoardWriterServiceStub"
        ):
            # Set up an UploadIntent configured with one_shot and a
            # non-existent directory.
            intent = uploader_subcommand.UploadIntent(
                "/dev/null/non/existent/directory", one_shot=True
            )
            # Execute the intent.execute method.
            intent.execute(server_info_pb2.ServerInfoResponse(), None)
        # Expect that there is no call to create an experiment.
        self.assertEqual(mock_uploader.create_experiment.call_count, 0)
        # Expect a message to the user indicating no experiment was created.
        stdout_writes = [x[0][0] for x in mock_stdout_write.call_args_list]
        self.assertRegex(
            ",".join(stdout_writes),
            ".*Exiting without creating an experiment.*",
        )

    def testUploadIntentOneShot(self):
        """Test the upload intent under the one-shot mode."""
        # Mock three places:
        # 1. The uploader itself, we will inspect invocations of its methods but
        #    do not want to actually uplaod anything.
        # 2. Writing to stdout, so we can inspect messages to the user.
        # 3. The creation of the grpc WriteServiceChannel, which happens in the
        #    non dry_run execution, but we don't want to actually open a network
        #    communication.        mock_uploader = mock.MagicMock()
        mock_uploader = mock.MagicMock()
        mock_uploader.create_experiment = mock.MagicMock(
            return_value="fake_experiment_id"
        )
        mock_stdout_write = mock.MagicMock()
        with mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            uploader_lib, "TensorBoardUploader", return_value=mock_uploader
        ), mock.patch.object(
            write_service_pb2_grpc, "TensorBoardWriterServiceStub"
        ):
            # Set up an UploadIntent configured with one_shot and an empty temp
            # directory.
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), one_shot=True
            )
            # Execute the intent.execute method.
            intent.execute(server_info_pb2.ServerInfoResponse(), None)
        # Expect that there is one call to create_experiment.
        self.assertEqual(mock_uploader.create_experiment.call_count, 1)
        # Expect that there is one call to start_uploading.
        self.assertEqual(mock_uploader.start_uploading.call_count, 1)
        # Expect that ".*Done scanning logdir.*" is among the things printed.
        stdout_writes = [x[0][0] for x in mock_stdout_write.call_args_list]
        self.assertRegex(
            ",".join(stdout_writes), ".*experiment created.*",
        )
        # Expect that the last thing written is the string "Done" and the
        # experiment_id.
        self.assertRegex(stdout_writes[-1], ".*Done.*")
        self.assertRegex(stdout_writes[-1], ".*fake_experiment_id.*")

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
        self.assertRegex(
            mock_stdout_write.call_args_list[-1][0][0], ".*Interrupted.*"
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
