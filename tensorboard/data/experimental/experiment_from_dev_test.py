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
"""Tests for tensorboard.uploader.exporter."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import sys
from unittest import mock

import grpc
import grpc_testing
import numpy as np
import tensorflow as tf

from tensorboard.data.experimental import experiment_from_dev
from tensorboard.uploader import test_util
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.util import grpc_util


class ExperimentFromDevTest(tf.test.TestCase):
    def test_get_scalars_works(self):
        mock_api_client = mock.Mock()

        def stream_experiment_data(request, **kwargs):
            self.assertEqual(request.experiment_id, "789")
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())
            for run in ("train", "test"):
                for tag in ("accuracy", "loss"):
                    response = export_service_pb2.StreamExperimentDataResponse()
                    response.run_name = run
                    response.tag_name = tag
                    display_name = "%s:%s" % (request.experiment_id, tag)
                    response.tag_metadata.CopyFrom(
                        test_util.scalar_metadata(display_name)
                    )
                    for step in range(10):
                        response.points.steps.append(step)
                        if tag == "loss":
                            if run == "train":
                                value = 1.0 / (step + 1)
                                seconds = step
                            else:
                                value = -1.0 / (step + 1)
                                seconds = 600 + step
                        else:  # "accuracy"
                            if run == "train":
                                value = 1.0 / (10 - step)
                                seconds = step * 2
                            else:
                                value = -1.0 / (10 - step)
                                seconds = 600 + step * 2
                        response.points.values.append(value)
                        response.points.wall_times.add(seconds=seconds, nanos=0)
                    yield response

        mock_api_client.StreamExperimentData = mock.Mock(
            wraps=stream_experiment_data
        )

        with mock.patch.object(
            experiment_from_dev,
            "get_api_client",
            lambda api_endpoint: mock_api_client,
        ):
            experiment = experiment_from_dev.ExperimentFromDev("789")
            for pivot in (None, False):
                with self.subTest("pivot=%s" % pivot):
                    dataframe = experiment.get_scalars(pivot=pivot)

                    if pivot is None:  # Default behavior: pivot_table.
                        # Check index.
                        train_index = dataframe.loc["train"].index
                        self.assertEqual(train_index.name, "step")
                        self.assertAllEqual(train_index, np.arange(0, 10))
                        test_index = dataframe.loc["test"].index
                        self.assertEqual(test_index.name, "step")
                        self.assertAllEqual(test_index, np.arange(0, 10))

                        # Check values.
                        train_losses = list(
                            dataframe.loc["train", ("value", "loss")]
                        )
                        self.assertAllClose(
                            train_losses, 1.0 / (np.arange(0, 10) + 1.0)
                        )
                        train_accuracies = list(
                            dataframe.loc["train", ("value", "accuracy")]
                        )
                        self.assertAllClose(
                            train_accuracies, 1.0 / (10.0 - np.arange(0, 10))
                        )
                        test_losses = list(
                            dataframe.loc["test", ("value", "loss")]
                        )
                        self.assertAllClose(
                            test_losses, -1.0 / (np.arange(0, 10) + 1.0)
                        )
                        test_accuracies = list(
                            dataframe.loc["test", ("value", "accuracy")]
                        )
                        self.assertAllClose(
                            test_accuracies, -1.0 / (10.0 - np.arange(0, 10))
                        )

                        # Check wall_times.
                        train_loss_wall_times = list(
                            dataframe.loc["train", ("wall_time", "loss")]
                        )
                        self.assertAllClose(
                            train_loss_wall_times, np.arange(0, 10)
                        )
                        train_accracy_wall_times = list(
                            dataframe.loc["train", ("wall_time", "accuracy")]
                        )
                        self.assertAllClose(
                            train_accracy_wall_times, 2 * np.arange(0, 10)
                        )
                        test_loss_wall_times = list(
                            dataframe.loc["test", ("wall_time", "loss")]
                        )
                        self.assertAllClose(
                            test_loss_wall_times, 600 + np.arange(0, 10)
                        )
                        test_accracy_wall_times = list(
                            dataframe.loc["test", ("wall_time", "accuracy")]
                        )
                        self.assertAllClose(
                            test_accracy_wall_times, 600 + 2 * np.arange(0, 10)
                        )
                    else:  # pivot == False
                        self.assertAllEqual(
                            dataframe.columns.values,
                            ["run", "tag", "step", "wall_time", "value"],
                        )
                        self.assertAllEqual(
                            dataframe["run"].values,
                            ["train"] * 20 + ["test"] * 20,
                        )
                        self.assertAllEqual(
                            dataframe["tag"].values,
                            (["accuracy"] * 10 + ["loss"] * 10) * 2,
                        )
                        self.assertAllEqual(
                            dataframe["step"].values, list(np.arange(0, 10)) * 4
                        )
                        self.assertAllClose(
                            dataframe["wall_time"].values,
                            np.concatenate(
                                [
                                    2 * np.arange(0, 10),
                                    np.arange(0, 10),
                                    600 + 2 * np.arange(0, 10),
                                    600 + np.arange(0, 10),
                                ]
                            ),
                        )
                        self.assertAllClose(
                            dataframe["value"].values,
                            np.concatenate(
                                [
                                    1.0 / (10.0 - np.arange(0, 10)),
                                    1.0 / (1.0 + np.arange(0, 10)),
                                    -1.0 / (10.0 - np.arange(0, 10)),
                                    -1.0 / (1.0 + np.arange(0, 10)),
                                ]
                            ),
                        )

    def test_get_scalars_with_pivot_table_with_missing_value(self):
        mock_api_client = mock.Mock()

        def stream_experiment_data(request, **kwargs):
            self.assertEqual(request.experiment_id, "789")
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())
            response = export_service_pb2.StreamExperimentDataResponse()
            response.run_name = "train"
            response.tag_name = "batch_loss"
            response.points.steps.append(0)
            response.points.values.append(0.5)
            response.points.wall_times.add(seconds=0, nanos=0)
            response.points.steps.append(1)
            response.points.values.append(0.25)
            response.points.wall_times.add(seconds=1, nanos=0)
            yield response
            response = export_service_pb2.StreamExperimentDataResponse()
            response.run_name = "train"
            response.tag_name = "epoch_loss"
            response.points.steps.append(0)
            response.points.values.append(0.375)
            response.points.wall_times.add(seconds=2, nanos=0)
            yield response

        mock_api_client.StreamExperimentData = mock.Mock(
            wraps=stream_experiment_data
        )

        with mock.patch.object(
            experiment_from_dev,
            "get_api_client",
            lambda api_endpoint: mock_api_client,
        ):
            experiment = experiment_from_dev.ExperimentFromDev("789")
            with self.assertRaisesRegexp(
                ValueError,
                r"missing value\(s\).*different sets of steps.*pivot=False",
            ):
                experiment.get_scalars()

    def test_get_scalars_with_actual_inf_and_nan(self):
        """Test for get_scalars() call that involve inf and nan in user data."""
        mock_api_client = mock.Mock()

        def stream_experiment_data(request, **kwargs):
            self.assertEqual(request.experiment_id, "789")
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())
            response = export_service_pb2.StreamExperimentDataResponse()
            response.run_name = "train"
            response.tag_name = "batch_loss"
            response.points.steps.append(0)
            response.points.values.append(np.nan)
            response.points.wall_times.add(seconds=0, nanos=0)
            response.points.steps.append(1)
            response.points.values.append(np.inf)
            response.points.wall_times.add(seconds=10, nanos=0)
            yield response

        mock_api_client.StreamExperimentData = mock.Mock(
            wraps=stream_experiment_data
        )

        with mock.patch.object(
            experiment_from_dev,
            "get_api_client",
            lambda api_endpoint: mock_api_client,
        ):
            experiment = experiment_from_dev.ExperimentFromDev("789")
            dataframe = experiment.get_scalars()

        # Check index.
        train_index = dataframe.loc["train"].index
        self.assertEqual(train_index.name, "step")
        self.assertAllEqual(train_index.values, [0, 1])
        # Check values.
        train_losses = list(dataframe.loc["train", ("value", "batch_loss")])
        self.assertAllEqual(train_losses, [np.nan, np.inf])
        # Check wall_times.
        train_loss_wall_times = list(
            dataframe.loc["train", ("wall_time", "batch_loss")]
        )
        self.assertAllClose(train_loss_wall_times, [0, 10])


if __name__ == "__main__":
    tf.test.main()
