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


import sys
from unittest import mock

import grpc
import tensorflow as tf

from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import server_info_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import dry_run_stubs
from tensorboard.uploader import exporter as exporter_lib
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import uploader_subcommand
from tensorboard.plugins.histogram import metadata as histograms_metadata
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.plugins import base_plugin


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
        #    do not want to actually upload anything.
        # 2. Writing to stdout, so we can inspect messages to the user.
        # 3. The creation of the grpc WriteServiceChannel, which happens in the
        #    non dry_run execution, but we don't want to actually open a network
        #    communication.
        mock_uploader = mock.MagicMock()
        mock_stdout_write = mock.MagicMock()
        with mock.patch.object(
            uploader_lib,
            "TensorBoardUploader",
            return_value=mock_uploader,
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
        #    do not want to actually upload anything.
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
            ",".join(stdout_writes),
            ".*experiment created.*",
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
        stub.CreateExperiment = (
            lambda req, **__: write_service_pb2.CreateExperimentResponse(
                experiment_id="test_experiment_id", url="this URL is ignored"
            )
        )

        expected_url = "https://tensorboard.dev/x/test_experiment_id"

        with mock.patch.object(
            dry_run_stubs,
            "DryRunTensorBoardWriterStub",
            wraps=lambda: stub,
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
            mock_uploader,
            "start_uploading",
            side_effect=KeyboardInterrupt(),
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
            mock_uploader,
            "start_uploading",
            side_effect=KeyboardInterrupt(),
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

    def testListIntentSetsExperimentMask(self):
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        expected_mask = experiment_pb2.ExperimentMask(
            name=True,
            description=True,
            create_time=True,
            update_time=True,
            num_runs=True,
            num_tags=True,
            num_scalars=True,
            total_tensor_bytes=True,
            total_blob_bytes=True,
        )
        with mock.patch.object(
            exporter_lib,
            "list_experiments",
        ):
            intent = uploader_subcommand._ListIntent()
            intent.execute(mock_server_info, mock_channel)
            actual_mask = exporter_lib.list_experiments.call_args[1][
                "fieldmask"
            ]
            self.assertEqual(actual_mask, expected_mask)

    def testDeleteIntentDeletesExistingExperiment(self):
        # Setup: A uploader_lib which will report success (return `None`) on the
        #   deletion of an experiment.
        eid_1 = "1111"
        mock_delete_experiment = mock.MagicMock(return_value=None)
        mock_stdout_write = mock.MagicMock()

        # Execute: A _DeleteExperimentIntent on the list containing exactly
        #  one experiment_id
        #
        # Mock three places:
        # 1. Writing to stdout, so we can inspect messages to the user.
        # 2. uploader_lib.delete_experiment itself, we will inspect invocations
        #    this method but do not want to actually delete anything.
        # 3. The creation of the grpc TensorBoardWriterServiceStub, which
        #    happens in intent, but we don't want to actually open a network
        #    communication.
        with mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            uploader_lib, "delete_experiment", mock_delete_experiment
        ), mock.patch.object(
            write_service_pb2_grpc, "TensorBoardWriterServiceStub"
        ):
            # Set up an UploadIntent configured with one_shot and an empty temp
            # directory.
            intent = uploader_subcommand._DeleteExperimentIntent(
                experiment_id_list=[eid_1]
            )
            # Execute the intent.execute method.
            intent.execute(server_info_pb2.ServerInfoResponse(), None)

        # Expect that there is one call to delete_experiment.
        self.assertEqual(mock_delete_experiment.call_count, 1)
        # Expect that ".*Deleted experiment.*" and the eid are among the things
        #    printed.
        stdout_writes = [x[0][0] for x in mock_stdout_write.call_args_list]
        self.assertRegex(
            ",".join(stdout_writes),
            f".*Deleted experiment {eid_1}.*",
        )

    def testDeleteIntentDeletesMultipleExperiments(self):
        # Setup: A uploader_lib which will report success (return `None`) on the
        #   deletion of an experiment.
        eid_1 = "1111"
        eid_2 = "22222"
        eid_3 = "333333"
        mock_delete_experiment = mock.MagicMock(return_value=None)
        mock_stdout_write = mock.MagicMock()

        # Execute: A _DeleteExperimentIntent on the list containing exactly
        #  three experiment_ids
        #
        # Mock three places:
        # 1. Writing to stdout, so we can inspect messages to the user.
        # 2. uploader_lib.delete_experiment itself, we will inspect invocations
        #    this method but do not want to actually delete anything.
        # 3. The creation of the grpc TensorBoardWriterServiceStub, which
        #    happens in intent, but we don't want to actually open a network
        #    communication.
        with mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            uploader_lib, "delete_experiment", mock_delete_experiment
        ), mock.patch.object(
            write_service_pb2_grpc, "TensorBoardWriterServiceStub"
        ):
            # Set up an UploadIntent configured with one_shot and an empty temp
            # directory.
            intent = uploader_subcommand._DeleteExperimentIntent(
                experiment_id_list=[eid_1, eid_2, eid_3]
            )
            # Execute the intent.execute method.
            intent.execute(server_info_pb2.ServerInfoResponse(), None)

        # Expect that there are three calls to delete_experiment.
        self.assertEqual(mock_delete_experiment.call_count, 3)
        # Expect that ".*Deleted experiment.*" and the eid are among the things
        #    printed.
        out_msg = ",".join([x[0][0] for x in mock_stdout_write.call_args_list])
        self.assertRegex(out_msg, f".*Deleted experiment {eid_1}.*")
        self.assertRegex(out_msg, f".*Deleted experiment {eid_2}.*")
        self.assertRegex(out_msg, f".*Deleted experiment {eid_3}.*")

    def testDeleteIntentHandlesUndeletableExperiemtns(self):
        # Setup: A uploader_lib which will emit scripted results for differen
        # eids.  See mock_delete_func for script.
        eid_1_ok = "1111"
        eid_2_empty = ""
        eid_3_ok = "3333"
        eid_4_missing = "4444"
        eid_5_ok = "5555"
        eid_6_permission_denied = "6666"
        eid_7_ok = "7777"
        eid_8_rate_limited = "8888"
        eid_9_ok = "9999"

        def mock_delete_func(_, eid):
            if eid == eid_4_missing:
                raise uploader_lib.ExperimentNotFoundError()
            if eid == eid_6_permission_denied:
                raise uploader_lib.PermissionDeniedError()
            if eid == eid_8_rate_limited:
                raise grpc.RpcError("Rate limited")
            return None

        mock_delete_experiment = mock.MagicMock(side_effect=mock_delete_func)
        mock_stdout_write = mock.MagicMock()
        mock_stderr_write = mock.MagicMock()
        mock_sys_exit = mock.MagicMock()

        # Execute: A _DeleteExperimentIntent on the motley list of
        #    experiments.
        #
        # Mock five places:
        # 1. Writing to stdout, so we can inspect messages to the user.
        # 2. Writing to stderr.
        # 3. uploader_lib.delete_experiment itself, we will inspect invocations
        #    this method but do not want to actually delete anything.
        # 4. The creation of the grpc TensorBoardWriterServiceStub, which
        #    happens in intent, but we don't want to actually open a network
        #    communication.
        # 5. Replace uploader_subcommand._die with something that wont
        #    actually kill the test.
        with mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            sys.stderr, "write", mock_stderr_write
        ), mock.patch.object(
            uploader_lib, "delete_experiment", mock_delete_experiment
        ), mock.patch.object(
            write_service_pb2_grpc, "TensorBoardWriterServiceStub"
        ), mock.patch.object(
            sys, "exit", mock_sys_exit
        ):
            # Set up an UploadIntent configured with one_shot and an empty temp
            # directory.
            intent = uploader_subcommand._DeleteExperimentIntent(
                experiment_id_list=[
                    eid_1_ok,
                    eid_2_empty,
                    eid_3_ok,
                    eid_4_missing,
                    eid_5_ok,
                    eid_6_permission_denied,
                    eid_7_ok,
                    eid_8_rate_limited,
                    eid_9_ok,
                ]
            )
            # Execute the intent.execute method.
            intent.execute(server_info_pb2.ServerInfoResponse(), None)

        # Expect that there are eight calls to delete_experiment, one for each
        # experiment *except* the empty one.
        self.assertEqual(mock_delete_experiment.call_count, 8)
        # Expect that ".*Deleted experiment.*" and the eid are among the things
        #    printed to stdout
        stdout_msg = ",".join(
            [x[0][0] for x in mock_stdout_write.call_args_list]
        )
        self.assertRegex(stdout_msg, f".*Deleted experiment {eid_1_ok}.*")
        self.assertRegex(stdout_msg, f".*Deleted experiment {eid_3_ok}.*")
        self.assertRegex(stdout_msg, f".*Deleted experiment {eid_5_ok}.*")
        self.assertRegex(stdout_msg, f".*Deleted experiment {eid_7_ok}.*")
        self.assertRegex(stdout_msg, f".*Deleted experiment {eid_9_ok}.*")
        self.assertRegex(stdout_msg, ".*Skipping empty experiment_id.*")
        self.assertNotRegex(
            stdout_msg, f".*Deleted experiment {eid_4_missing}.*"
        )
        self.assertNotRegex(
            stdout_msg, f".*Deleted experiment {eid_6_permission_denied}.*"
        )
        self.assertNotRegex(
            stdout_msg, f".*Deleted experiment {eid_8_rate_limited}.*"
        )
        # Expect appropriate error messages sent to stderr
        stderr_msg = ",".join(
            [x[0][0] for x in mock_stderr_write.call_args_list]
        )
        self.assertRegex(stderr_msg, f".*No such experiment {eid_4_missing}.*")
        self.assertRegex(
            stderr_msg,
            f".*Cannot delete experiment {eid_6_permission_denied}.*",
        )
        self.assertRegex(
            stderr_msg,
            f".*Internal error deleting experiment {eid_8_rate_limited}.*",
        )
        # Expect a call to kill the process.
        self.assertEqual(mock_sys_exit.call_count, 1)

    def testDeleteIntentRaisesWhenAskedToDeleteZeroExperiments(self):
        mock_delete_experiment = mock.MagicMock(return_value=None)
        mock_stdout_write = mock.MagicMock()

        # Execute: A _DeleteExperimentIntent on the empty list.
        #
        # Mock three places:
        # 1. Writing to stdout, so we can inspect messages to the user.
        # 2. uploader_lib.delete_experiment itself, we will inspect invocations
        #    this method but do not want to actually delete anything.
        # 3. The creation of the grpc TensorBoardWriterServiceStub, which
        #    happens in intent, but we don't want to actually open a network
        #    communication.
        with mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            uploader_lib, "delete_experiment", mock_delete_experiment
        ), mock.patch.object(
            write_service_pb2_grpc, "TensorBoardWriterServiceStub"
        ):
            # Set up an UploadIntent configured with one_shot and an empty temp
            # directory.
            intent = uploader_subcommand._DeleteExperimentIntent(
                experiment_id_list=[]
            )
            # Execute the intent.execute method.
            # Expect raises with appropriate message.
            with self.assertRaisesRegex(
                base_plugin.FlagsError,
                "Must specify at least one experiment ID to delete.*",
            ):
                intent.execute(server_info_pb2.ServerInfoResponse(), None)

        # Expect:
        # Expect that there are zero calls to delete_experiment.
        self.assertEqual(mock_delete_experiment.call_count, 0)


if __name__ == "__main__":
    tf.test.main()
