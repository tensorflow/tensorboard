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
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import exporter as exporter_lib
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import uploader_subcommand
from tensorboard.plugins import base_plugin


class IntentTest(tf.test.TestCase):
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
