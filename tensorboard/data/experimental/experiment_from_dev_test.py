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

from unittest import mock

import numpy as np
import pandas

from tensorboard import test as tb_test
from tensorboard.data.experimental import experiment_from_dev
from tensorboard.uploader import test_util
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.util import grpc_util


class ExperimentFromDevTest(tb_test.TestCase):
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
            for pivot in (False, True):
                for include_wall_time in (False, True):
                    with self.subTest(
                        "pivot=%s; include_wall_time=%s"
                        % (pivot, include_wall_time)
                    ):
                        dataframe = experiment.get_scalars(
                            pivot=pivot, include_wall_time=include_wall_time
                        )

                        if pivot:
                            run_key = (
                                ("run", "") if include_wall_time else "run"
                            )
                            step_key = (
                                ("step", "") if include_wall_time else "step"
                            )
                            accuracy_value_key = (
                                ("value", "accuracy")
                                if include_wall_time
                                else "accuracy"
                            )
                            loss_value_key = (
                                ("value", "loss")
                                if include_wall_time
                                else "loss"
                            )
                            data = {
                                run_key: ["test"] * 10 + ["train"] * 10,
                                step_key: np.concatenate(
                                    [np.arange(0, 10), np.arange(0, 10)]
                                ),
                                accuracy_value_key: np.concatenate(
                                    [
                                        -1.0 / (10.0 - np.arange(0, 10)),
                                        1.0 / (10.0 - np.arange(0, 10)),
                                    ],
                                ),
                                loss_value_key: np.concatenate(
                                    [
                                        -1.0 / (1.0 + np.arange(0, 10)),
                                        1.0 / (1.0 + np.arange(0, 10)),
                                    ],
                                ),
                            }
                            if include_wall_time:
                                data[
                                    ("wall_time", "accuracy")
                                ] = np.concatenate(
                                    [
                                        600.0 + 2.0 * np.arange(0, 10),
                                        2.0 * np.arange(0, 10),
                                    ]
                                )
                                data[("wall_time", "loss")] = np.concatenate(
                                    [
                                        600.0 + np.arange(0, 10),
                                        1.0 * np.arange(0, 10),
                                    ]
                                )
                            expected = pandas.DataFrame(data)
                        else:  # No pivot_table.
                            data = {
                                "run": ["train"] * 20 + ["test"] * 20,
                                "tag": (["accuracy"] * 10 + ["loss"] * 10) * 2,
                                "step": list(np.arange(0, 10)) * 4,
                                "value": np.concatenate(
                                    [
                                        1.0 / (10.0 - np.arange(0, 10)),
                                        1.0 / (1.0 + np.arange(0, 10)),
                                        -1.0 / (10.0 - np.arange(0, 10)),
                                        -1.0 / (1.0 + np.arange(0, 10)),
                                    ]
                                ),
                            }
                            if include_wall_time:
                                data["wall_time"] = np.concatenate(
                                    [
                                        2.0 * np.arange(0, 10),
                                        1.0 * np.arange(0, 10),
                                        600.0 + 2.0 * np.arange(0, 10),
                                        600.0 + np.arange(0, 10),
                                    ]
                                )
                            expected = pandas.DataFrame(data)

                        pandas.testing.assert_frame_equal(
                            dataframe, expected, check_names=True,
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
                r"contains missing value\(s\).*different sets of "
                r"steps.*pivot=False",
            ):
                experiment.get_scalars(pivot=True)

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
            dataframe = experiment.get_scalars(pivot=True)

        expected = pandas.DataFrame(
            {
                "run": ["train"] * 2,
                "step": [0, 1],
                "batch_loss": [np.nan, np.inf],
            }
        )
        pandas.testing.assert_frame_equal(dataframe, expected, check_names=True)


if __name__ == "__main__":
    tb_test.main()
