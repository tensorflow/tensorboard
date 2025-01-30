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
"""Tests for list_session_groups."""


import operator
from unittest import mock

import tensorflow as tf

from google.protobuf import text_format
from tensorboard import context
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import list_session_groups
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2


DATA_TYPE_EXPERIMENT = "experiment"
DATA_TYPE_SESSION_START_INFO = "session_start_info"
DATA_TYPE_SESSION_END_INFO = "session_end_info"


class ListSessionGroupsTest(tf.test.TestCase):
    # Make assertProtoEquals print all the diff.
    maxDiff = None  # pylint: disable=invalid-name

    def setUp(self):
        self._mock_tb_context = base_plugin.TBContext()
        self._mock_tb_context.data_provider = mock.create_autospec(
            provider.DataProvider
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = (
            self._mock_list_tensors
        )
        self._mock_tb_context.data_provider.list_scalars.side_effect = (
            self._mock_list_scalars
        )
        self._mock_tb_context.data_provider.read_last_scalars.side_effect = (
            self._mock_read_last_scalars
        )
        self._mock_tb_context.data_provider.read_hyperparameters.side_effect = (
            self._mock_read_hyperparameters
        )
        self._hyperparameters = []

    def _mock_list_tensors(
        self, ctx, *, experiment_id, plugin_name, run_tag_filter
    ):
        hparams_content = {
            "": {
                metadata.EXPERIMENT_TAG: self._serialized_plugin_data(
                    DATA_TYPE_EXPERIMENT,
                    """
                    description: 'Test experiment'
                    user: 'Test user'
                    hparam_infos: [
                      {
                        name: 'initial_temp'
                        type: DATA_TYPE_FLOAT64
                      },
                      {
                        name: 'final_temp'
                        type: DATA_TYPE_FLOAT64
                      },
                      { name: 'string_hparam' },
                      { name: 'bool_hparam' },
                      { name: 'optional_string_hparam' }
                    ]
                    metric_infos: [
                      { name: { tag: 'current_temp' } },
                      { name: { tag: 'delta_temp' } },
                      { name: { tag: 'optional_metric' } }
                    ]
                    """,
                )
            },
            "session_1": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'initial_temp' value: { number_value: 270 } },
                    hparams:{ key: 'final_temp' value: { number_value: 150 } },
                    hparams:{
                      key: 'string_hparam' value: { string_value: 'a string' }
                    },
                    hparams:{ key: 'bool_hparam' value: { bool_value: true } }
                    group_name: 'group_1'
                    start_time_secs: 314159
                    """,
                ),
                metadata.SESSION_END_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_END_INFO,
                    """
                    status: STATUS_SUCCESS
                    end_time_secs: 314164
                    """,
                ),
            },
            "session_2": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'initial_temp' value: { number_value: 280 } },
                    hparams:{ key: 'final_temp' value: { number_value: 100 } },
                    hparams:{
                      key: 'string_hparam' value: { string_value: 'AAAAA' }
                    },
                    hparams:{ key: 'bool_hparam' value: { bool_value: false } }
                    group_name: 'group_2'
                    start_time_secs: 314159
                    """,
                ),
                metadata.SESSION_END_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_END_INFO,
                    """
                    status: STATUS_SUCCESS
                    end_time_secs: 314164
                    """,
                ),
            },
            "session_3": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'initial_temp' value: { number_value: 280 } },
                    hparams:{ key: 'final_temp' value: { number_value: 100 } },
                    hparams:{
                      key: 'string_hparam' value: { string_value: 'AAAAA' }
                    },
                    hparams:{ key: 'bool_hparam' value: { bool_value: false } }
                    group_name: 'group_2'
                    start_time_secs: 314159
                    """,
                ),
                metadata.SESSION_END_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_END_INFO,
                    """
                    status: STATUS_FAILURE
                    end_time_secs: 314164
                    """,
                ),
            },
            "session_4": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'initial_temp' value: { number_value: 300 } },
                    hparams:{ key: 'final_temp' value: { number_value: 120 } },
                    hparams:{
                      key: 'string_hparam' value: { string_value: 'a string_3' }
                    },
                    hparams:{ key: 'bool_hparam' value: { bool_value: true } }
                    hparams:{
                      key: 'optional_string_hparam' value { string_value: 'BB' }
                    },
                    group_name: 'group_3'
                    start_time_secs: 314159
                    """,
                ),
                metadata.SESSION_END_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_END_INFO,
                    """
                    status: STATUS_UNKNOWN
                    end_time_secs: 314164
                    """,
                ),
            },
            "session_5": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'initial_temp' value: { number_value: 280 } },
                    hparams:{ key: 'final_temp' value: { number_value: 100 } },
                    hparams:{
                      key: 'string_hparam' value: { string_value: 'AAAAA' }
                    },
                    hparams:{ key: 'bool_hparam' value: { bool_value: false } }
                    group_name: 'group_2'
                    start_time_secs: 314159
                    """,
                ),
                metadata.SESSION_END_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_END_INFO,
                    """
                    status: STATUS_SUCCESS
                    end_time_secs: 314164
                    """,
                ),
            },
        }
        result = {}
        for run, tag_to_content in hparams_content.items():
            result.setdefault(run, {})
            for tag, content in tag_to_content.items():
                t = provider.TensorTimeSeries(
                    max_step=0,
                    max_wall_time=0,
                    plugin_content=content,
                    description="",
                    display_name="",
                )
                result[run][tag] = t
        return result

    def _mock_list_scalars(
        self,
        ctx,
        *,
        experiment_id,
        plugin_name,
        run_tag_filter=provider.RunTagFilter(),
    ):
        """Mock data for DataProvider.list_scalars().

        The ScalarTimeSeries generated here correspond to the scalar values
        generated by _mock_read_last_scalars().

        These are currently used exclusively by the DataProvider-based hparams
        to generate metric_infos whereas the classic Tensor-based hparams
        generate metric_infos from the ExperimentTag in _mock_list_tensors().
        """
        scalars_content = {
            "session_1": {
                "current_temp": b"",
                "delta_temp": b"",
                "optional_metric": b"",
            },
            "session_2": {"current_temp": b"", "delta_temp": b""},
            "session_3": {"current_temp": b"", "delta_temp": b""},
            "session_4": {"current_temp": b"", "delta_temp": b""},
            "session_5": {"current_temp": b"", "delta_temp": b""},
        }
        result = {}
        for run, tag_to_content in scalars_content.items():
            result.setdefault(run, {})
            for tag, content in tag_to_content.items():
                t = provider.ScalarTimeSeries(
                    max_step=0,
                    max_wall_time=0,
                    plugin_content=content,
                    description="",
                    display_name="",
                )
                result[run][tag] = t
        return result

    def _mock_read_last_scalars(
        self,
        ctx=None,
        *,
        experiment_id,
        plugin_name,
        run_tag_filter=None,
    ):
        hparams_time_series = [
            provider.ScalarDatum(wall_time=123.75, step=0, value=0.0)
        ]
        result_dict = {
            "": {
                metadata.EXPERIMENT_TAG: hparams_time_series[-1],
            },
            "session_1": {
                metadata.SESSION_START_INFO_TAG: hparams_time_series[-1],
                metadata.SESSION_END_INFO_TAG: hparams_time_series[-1],
                "current_temp": provider.ScalarDatum(
                    wall_time=1,
                    step=1,
                    value=10.0,
                ),
                "delta_temp": provider.ScalarDatum(
                    wall_time=10,
                    step=2,
                    value=15.0,
                ),
                "optional_metric": provider.ScalarDatum(
                    wall_time=2,
                    step=20,
                    value=33.0,
                ),
            },
            "session_2": {
                metadata.SESSION_START_INFO_TAG: hparams_time_series[-1],
                metadata.SESSION_END_INFO_TAG: hparams_time_series[-1],
                "current_temp": provider.ScalarDatum(
                    wall_time=1,
                    step=1,
                    value=100.0,
                ),
                "delta_temp": provider.ScalarDatum(
                    wall_time=11,
                    step=3,
                    value=150.0,
                ),
            },
            "session_3": {
                metadata.SESSION_START_INFO_TAG: hparams_time_series[-1],
                metadata.SESSION_END_INFO_TAG: hparams_time_series[-1],
                "current_temp": provider.ScalarDatum(
                    wall_time=1,
                    step=1,
                    value=1.0,
                ),
                "delta_temp": provider.ScalarDatum(
                    wall_time=10,
                    step=2,
                    value=1.5,
                ),
            },
            "session_4": {
                metadata.SESSION_START_INFO_TAG: hparams_time_series[-1],
                metadata.SESSION_END_INFO_TAG: hparams_time_series[-1],
                "current_temp": provider.ScalarDatum(
                    wall_time=1,
                    step=1,
                    value=101.0,
                ),
                "delta_temp": provider.ScalarDatum(
                    wall_time=10,
                    step=2,
                    value=-151.0,
                ),
            },
            "session_5": {
                metadata.SESSION_START_INFO_TAG: hparams_time_series[-1],
                metadata.SESSION_END_INFO_TAG: hparams_time_series[-1],
                "current_temp": provider.ScalarDatum(
                    wall_time=1,
                    step=1,
                    value=52.0,
                ),
                "delta_temp": provider.ScalarDatum(
                    wall_time=10,
                    step=2,
                    value=-18,
                ),
            },
        }
        return result_dict

    def _mock_read_hyperparameters(
        self,
        *args,
        **kwargs,
    ):
        return self._hyperparameters

    def test_empty_request(self):
        # Since we don't allow any statuses, result should be empty.
        self.assertProtoEquals("total_size: 0", self._run_handler(request=""))

    def test_no_filter_no_sort(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_AVG
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
            session_groups {
              name: "group_1"
              hparams { key: "bool_hparam" value { bool_value: true } }
              hparams { key: "final_temp" value { number_value: 150.0 } }
              hparams { key: "initial_temp" value { number_value: 270.0 } }
              hparams { key: "string_hparam" value { string_value: "a string" } }
              metric_values {
                name { tag: "current_temp" }
                value: 10
                training_step: 1
                wall_time_secs: 1.0
              }
              metric_values { name { tag: "delta_temp" } value: 15
                training_step: 2
                wall_time_secs: 10.0
              }
              metric_values { name { tag: "optional_metric" } value: 33
                training_step: 20
                wall_time_secs: 2.0
              }
              sessions {
                name: "session_1"
                start_time_secs: 314159
                end_time_secs: 314164
                status: STATUS_SUCCESS
                metric_values {
                  name { tag: "current_temp" }
                  value: 10
                  training_step: 1
                  wall_time_secs: 1.0
                }
                metric_values {
                  name { tag: "delta_temp" }
                  value: 15
                  training_step: 2
                  wall_time_secs: 10.0
                }

                metric_values {
                  name { tag: "optional_metric" }
                  value: 33
                  training_step: 20
                  wall_time_secs: 2.0
                }
              }
            }
            session_groups {
              name: "group_2"
              hparams { key: "bool_hparam" value { bool_value: false } }
              hparams { key: "final_temp" value { number_value: 100.0 } }
              hparams { key: "initial_temp" value { number_value: 280.0 } }
              hparams { key: "string_hparam" value { string_value: "AAAAA"}}
              metric_values {
                name { tag: "current_temp" }
                value: 51.0
                training_step: 1
                wall_time_secs: 1.0
              }
              metric_values {
                name { tag: "delta_temp" }
                value: 44.5
                training_step: 2
                wall_time_secs: 10.3333333
              }
              sessions {
                name: "session_2"
                start_time_secs: 314159
                end_time_secs: 314164
                status: STATUS_SUCCESS
                metric_values {
                  name { tag: "current_temp" }
                  value: 100
                  training_step: 1
                  wall_time_secs: 1.0
                }
                metric_values { name { tag: "delta_temp" }
                  value: 150
                  training_step: 3
                  wall_time_secs: 11.0
                }
              }
              sessions {
                name: "session_3"
                start_time_secs: 314159
                end_time_secs: 314164
                status: STATUS_FAILURE
                metric_values {
                  name { tag: "current_temp" }
                  value: 1.0
                  training_step: 1
                  wall_time_secs: 1.0
                }
                metric_values { name { tag: "delta_temp" }
                  value: 1.5
                  training_step: 2
                  wall_time_secs: 10.0
                }
              }
              sessions {
                name: "session_5"
                start_time_secs: 314159
                end_time_secs: 314164
                status: STATUS_SUCCESS
                metric_values {
                  name { tag: "current_temp" }
                  value: 52.0
                  training_step: 1
                  wall_time_secs: 1.0
                }
                metric_values { name { tag: "delta_temp" }
                  value: -18
                  training_step: 2
                  wall_time_secs: 10.0
                }
              }
            }
            session_groups {
              name: "group_3"
              hparams { key: "bool_hparam" value { bool_value: true } }
              hparams { key: "final_temp" value { number_value: 120.0 } }
              hparams { key: "initial_temp" value { number_value: 300.0 } }
              hparams { key: "string_hparam" value { string_value: "a string_3"}}
              hparams {
                key: 'optional_string_hparam' value { string_value: 'BB' }
              }
              metric_values {
                name { tag: "current_temp" }
                value: 101.0
                training_step: 1
                wall_time_secs: 1.0
              }
              metric_values { name { tag: "delta_temp" } value: -151.0
                training_step: 2
                wall_time_secs: 10.0
              }
              sessions {
                name: "session_4"
                start_time_secs: 314159
                end_time_secs: 314164
                status: STATUS_UNKNOWN
                metric_values {
                  name { tag: "current_temp" }
                  value: 101.0
                  training_step: 1
                  wall_time_secs: 1.0
                }
                metric_values { name { tag: "delta_temp" } value: -151.0
                  training_step: 2
                  wall_time_secs: 10.0
                }
              }
            }
            total_size: 3
            """,
            response,
        )

    def test_no_allowed_statuses(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: []
            aggregation_type: AGGREGATION_AVG
        """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups), 0)

    def test_some_allowed_statuses(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [STATUS_UNKNOWN, STATUS_SUCCESS]
            aggregation_type: AGGREGATION_AVG
        """
        response = self._run_handler(request)
        self.assertEqual(
            _reduce_to_names(response.session_groups),
            [
                ("group_1", ["session_1"]),
                ("group_2", ["session_2", "session_5"]),
                ("group_3", ["session_4"]),
            ],
        )

    def test_include_in_result(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_AVG
            col_params {
              hparam: "bool_hparam"
              include_in_result: True
            }
            col_params {
              hparam: "initial_temp"
            }
            col_params {
              hparam: "string_hparam"
              include_in_result: False
            }
        """
        response = self._run_handler(request)

        # Each of the session groups and sessions have two hparams and three metrics to include.
        # Only check the first two session groups.
        self.assertCountEqual(
            response.session_groups[0].hparams, ["bool_hparam", "initial_temp"]
        )
        self.assertLen(response.session_groups[0].metric_values, 3)

        self.assertCountEqual(
            response.session_groups[0].hparams, ["bool_hparam", "initial_temp"]
        )
        self.assertLen(response.session_groups[0].metric_values, 3)

    def test_some_allowed_statuses_empty_groups(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [STATUS_FAILURE]
            aggregation_type: AGGREGATION_AVG
        """
        response = self._run_handler(request)
        self.assertEqual(
            _reduce_to_names(response.session_groups),
            [("group_2", ["session_3"])],
        )

    def test_aggregation_median_current_temp(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_MEDIAN
            aggregation_metric: { tag: "current_temp" }
        """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups[1].metric_values), 2)
        self.assertProtoEquals(
            """
            name { tag: "current_temp" }
            value: 52.0
            training_step: 1
            wall_time_secs: 1.0
            """,
            response.session_groups[1].metric_values[0],
        )
        self.assertProtoEquals(
            """
            name { tag: "delta_temp" }
            value: -18.0
            training_step: 2
            wall_time_secs: 10.0
            """,
            response.session_groups[1].metric_values[1],
        )

    def test_aggregation_median_delta_temp(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_MEDIAN
            aggregation_metric: { tag: "delta_temp" }
        """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups[1].metric_values), 2)
        self.assertProtoEquals(
            """
            name { tag: "current_temp" }
            value: 1.0
            training_step: 1
            wall_time_secs: 1.0
            """,
            response.session_groups[1].metric_values[0],
        )
        self.assertProtoEquals(
            """
            name { tag: "delta_temp" }
            value: 1.5
            training_step: 2
            wall_time_secs: 10.0
            """,
            response.session_groups[1].metric_values[1],
        )

    def test_aggregation_max_current_temp(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_MAX
            aggregation_metric: { tag: "current_temp" }
        """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups[1].metric_values), 2)
        self.assertProtoEquals(
            """
            name { tag: "current_temp" }
            value: 100
            training_step: 1
            wall_time_secs: 1.0
            """,
            response.session_groups[1].metric_values[0],
        )
        self.assertProtoEquals(
            """
            name { tag: "delta_temp" }
            value: 150.0
            training_step: 3
            wall_time_secs: 11.0
            """,
            response.session_groups[1].metric_values[1],
        )

    def test_aggregation_max_delta_temp(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_MAX
            aggregation_metric: { tag: "delta_temp" }
            """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups[1].metric_values), 2)
        self.assertProtoEquals(
            """
            name { tag: "current_temp" }
            value: 100.0
            training_step: 1
            wall_time_secs: 1.0
            """,
            response.session_groups[1].metric_values[0],
        )
        self.assertProtoEquals(
            """
            name { tag: "delta_temp" }
            value: 150.0
            training_step: 3
            wall_time_secs: 11.0
            """,
            response.session_groups[1].metric_values[1],
        )

    def test_aggregation_min_current_temp(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_MIN
            aggregation_metric: { tag: "current_temp" }
            """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups[1].metric_values), 2)
        self.assertProtoEquals(
            """
            name { tag: "current_temp" }
            value: 1.0
            training_step: 1
            wall_time_secs: 1.0
            """,
            response.session_groups[1].metric_values[0],
        )
        self.assertProtoEquals(
            """
            name { tag: "delta_temp" }
            value: 1.5
            training_step: 2
            wall_time_secs: 10.0
            """,
            response.session_groups[1].metric_values[1],
        )

    def test_aggregation_min_delta_temp(self):
        request = """
            start_index: 0
            slice_size: 3
            allowed_statuses: [
              STATUS_UNKNOWN,
              STATUS_SUCCESS,
              STATUS_FAILURE,
              STATUS_RUNNING
            ]
            aggregation_type: AGGREGATION_MIN
            aggregation_metric: { tag: "delta_temp" }
        """
        response = self._run_handler(request)
        self.assertEqual(len(response.session_groups[1].metric_values), 2)
        self.assertProtoEquals(
            """
            name { tag: "current_temp" }
            value: 52.0
            training_step: 1
            wall_time_secs: 1.0
            """,
            response.session_groups[1].metric_values[0],
        )
        self.assertProtoEquals(
            """
            name { tag: "delta_temp" }
            value: -18.0
            training_step: 2
            wall_time_secs: 10.0
            """,
            response.session_groups[1].metric_values[1],
        )

    def test_no_filter_no_sort_partial_slice(self):
        self._verify_handler(
            request="""
                start_index: 1
                slice_size: 1
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
            """,
            expected_session_group_names=["group_2"],
            expected_total_size=3,
        )

    def test_no_filter_exclude_missing_values(self):
        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'optional_metric' }
                  exclude_missing_values: true
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1"],
            expected_total_size=1,
        )

    def test_filter_regexp(self):
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'string_hparam'
                  filter_regexp: 'AA'
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_2"],
            expected_total_size=1,
        )
        # Test filtering out all session groups.
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'string_hparam'
                  filter_regexp: 'a string_100'
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=[],
            expected_total_size=0,
        )

    def test_filter_interval(self):
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'initial_temp'
                  filter_interval: { min_value: 270 max_value: 282 }
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1", "group_2"],
            expected_total_size=2,
        )

    def test_filter_discrete_set(self):
        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'current_temp' }
                  filter_discrete: { values: [{ number_value: 101.0 },
                                              { number_value: 10.0 }] }
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1", "group_3"],
            expected_total_size=2,
        )

    def test_filter_multiple_columns(self):
        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'current_temp' }
                  filter_discrete: { values: [{ number_value: 101.0 },
                                              { number_value: 10.0 }] }
                }
                col_params: {
                  hparam: 'initial_temp'
                  filter_interval: { min_value: 270 max_value: 282 }
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1"],
            expected_total_size=1,
        )

    def test_filter_single_column_with_missing_values(self):
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'optional_string_hparam'
                  filter_regexp: 'B'
                  exclude_missing_values: true
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_3"],
            expected_total_size=1,
        )
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'optional_string_hparam'
                  filter_regexp: 'B'
                  exclude_missing_values: false
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1", "group_2", "group_3"],
            expected_total_size=3,
        )

        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'optional_metric' }
                  filter_discrete: { values: { number_value: 33.0 } }
                  exclude_missing_values: true
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1"],
            expected_total_size=1,
        )

    def test_sort_one_column(self):
        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'delta_temp' }
                  order: ORDER_ASC
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_3", "group_1", "group_2"],
            expected_total_size=3,
        )
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'string_hparam'
                  order: ORDER_ASC
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_2", "group_1", "group_3"],
            expected_total_size=3,
        )
        # Test descending order.
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'string_hparam'
                  order: ORDER_DESC
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_3", "group_1", "group_2"],
            expected_total_size=3,
        )

    def test_sort_multiple_columns(self):
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'bool_hparam'
                  order: ORDER_ASC
                }
                col_params: {
                  metric: { tag: 'delta_temp' }
                  order: ORDER_ASC
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_2", "group_3", "group_1"],
            expected_total_size=3,
        )
        # Primary key in descending order. Secondary key in ascending order.
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'bool_hparam'
                  order: ORDER_DESC
                }
                col_params: {
                  metric: { tag: 'delta_temp' }
                  order: ORDER_ASC
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_3", "group_1", "group_2"],
            expected_total_size=3,
        )

    def test_sort_one_column_with_missing_values(self):
        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'optional_metric' }
                  order: ORDER_ASC
                  missing_values_first: false
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1", "group_2", "group_3"],
            expected_total_size=3,
        )
        self._verify_handler(
            request="""
                col_params: {
                  metric: { tag: 'optional_metric' }
                  order: ORDER_ASC
                  missing_values_first: true
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_2", "group_3", "group_1"],
            expected_total_size=3,
        )
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'optional_string_hparam'
                  order: ORDER_ASC
                  missing_values_first: false
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_3", "group_1", "group_2"],
            expected_total_size=3,
        )
        self._verify_handler(
            request="""
                col_params: {
                  hparam: 'optional_string_hparam'
                  order: ORDER_ASC
                  missing_values_first: true
                }
                allowed_statuses: [
                  STATUS_UNKNOWN,
                  STATUS_SUCCESS,
                  STATUS_FAILURE,
                  STATUS_RUNNING
                ]
                start_index: 0
                slice_size: 3
            """,
            expected_session_group_names=["group_1", "group_2", "group_3"],
            expected_total_size=3,
        )

    def _mock_list_tensors_invalid_number_values(
        self, ctx, *, experiment_id, plugin_name, run_tag_filter
    ):
        hparams_content = {
            "session_1": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'maybe_bad' value: { number_value: 1 } }
                    group_name: 'group_1'
                    """,
                )
            },
            "session_2": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'maybe_bad' value: { number_value: nan } }
                    group_name: 'group_2'
                    """,
                ),
            },
            "session_3": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'maybe_bad' value: { number_value: -infinity } }
                    group_name: 'group_3'
                    """,
                ),
            },
            "session_4": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO,
                    """
                    hparams:{ key: 'maybe_bad' value: { number_value: 4.0 } }
                    group_name: 'group_4'
                    """,
                ),
            },
        }
        result = {}
        for run, tag_to_content in hparams_content.items():
            result.setdefault(run, {})
            for tag, content in tag_to_content.items():
                t = provider.TensorTimeSeries(
                    max_step=0,
                    max_wall_time=0,
                    plugin_content=content,
                    description="",
                    display_name="",
                )
                result[run][tag] = t
        return result

    def test_hparams_with_invalid_number_values(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = (
            self._mock_list_tensors_invalid_number_values
        )
        request = """
            start_index: 0
            slice_size: 10
            allowed_statuses: [STATUS_UNKNOWN]
        """
        groups = self._run_handler(request).session_groups
        self.assertLen(groups, 4)
        self.assertEqual(1, groups[0].hparams.get("maybe_bad").number_value)
        self.assertEqual(None, groups[1].hparams.get("maybe_bad"))
        self.assertEqual(None, groups[2].hparams.get("maybe_bad"))
        self.assertEqual(4, groups[3].hparams.get("maybe_bad").number_value)

    def test_sort_hparams_with_invalid_number_values(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = (
            self._mock_list_tensors_invalid_number_values
        )
        self._verify_handler(
            request="""
                start_index: 0
                slice_size: 10
                allowed_statuses: [STATUS_UNKNOWN]
                col_params: {
                  hparam: 'maybe_bad'
                  order: ORDER_DESC
                }
            """,
            expected_session_group_names=[
                "group_4",
                "group_1",
                "group_2",
                "group_3",
            ],
            expected_total_size=4,
        )

    def test_filter_hparams_include_invalid_number_values(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = (
            self._mock_list_tensors_invalid_number_values
        )
        self._verify_handler(
            request="""
                start_index: 0
                slice_size: 10
                allowed_statuses: [STATUS_UNKNOWN]
                col_params: {
                  hparam: 'maybe_bad'
                  order: ORDER_DESC
                  filter_interval: { min_value: 2.0 max_value: 10.0 }
                }
            """,
            expected_session_group_names=["group_4", "group_2", "group_3"],
            expected_total_size=3,
        )

    def test_filter_hparams_exclude_invalid_number_values(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = (
            self._mock_list_tensors_invalid_number_values
        )
        self._verify_handler(
            request="""
                start_index: 0
                slice_size: 10
                allowed_statuses: [STATUS_UNKNOWN]
                col_params: {
                  hparam: 'maybe_bad'
                  exclude_missing_values: true
                }
            """,
            expected_session_group_names=["group_1", "group_4"],
            expected_total_size=2,
        )

    def test_include_metrics(self):
        with self.subTest("False"):
            request = """
                start_index: 0
                slice_size: 1
                allowed_statuses: [
                  STATUS_SUCCESS
                ]
                include_metrics: False
            """
            response = self._run_handler(request)
            self.assertEmpty(response.session_groups[0].metric_values)
            self.assertEmpty(
                response.session_groups[0].sessions[0].metric_values
            )

        with self.subTest("True"):
            request = """
                start_index: 0
                slice_size: 1
                allowed_statuses: [
                  STATUS_SUCCESS
                ]
                include_metrics: True
            """
            response = self._run_handler(request)
            self.assertLen(response.session_groups[0].metric_values, 3)
            self.assertLen(
                response.session_groups[0].sessions[0].metric_values, 3
            )

        with self.subTest("unspecified"):
            request = """
                start_index: 0
                slice_size: 1
                allowed_statuses: [
                  STATUS_SUCCESS
                ]
            """
            response = self._run_handler(request)
            self.assertLen(response.session_groups[0].metric_values, 3)
            self.assertLen(
                response.session_groups[0].sessions[0].metric_values, 3
            )

    def test_experiment_without_any_hparams(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = []
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals("", response)

    def test_experiment_from_data_provider_sends_empty_filter_and_sort_from_col_params(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        # The request specifies col params but without filter or sort information.
        request = """
            col_params: {
              hparam: 'hparam1'
            }
            col_params: {
              hparam: 'hparam2'
            }
        """
        self._run_handler(request)
        self.assertEqual(
            self._get_read_hyperparameters_call_filters(),
            [],
        )
        self.assertEqual(self._get_read_hyperparameters_call_sort(), [])

    def test_experiment_from_data_provider_sends_regex_filter(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        request = """
            col_params: {
              hparam: 'hparam1'
              filter_regexp: 'v.*ue'
            }
        """
        self._run_handler(request)
        self.assertEqual(
            self._get_read_hyperparameters_call_filters(),
            [
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam1",
                    filter_type=provider.HyperparameterFilterType.REGEX,
                    filter="v.*ue",
                )
            ],
        )

    def test_experiment_from_data_provider_sends_interval_filter(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        request = """
            col_params: {
              hparam: 'hparam1'
              filter_interval: {
                min_value: 0.1
                max_value: 0.2
              }
            }
            col_params: {
              hparam: 'hparam2'
              filter_interval: {
                min_value: 0.1
                max_value: Infinity
              }
            }
            col_params: {
              hparam: 'hparam3'
              filter_interval: {
                min_value: -Infinity
                max_value: 0.2
              }
            }
            col_params: {
              hparam: 'hparam4'
              filter_interval: {
              }
            }
        """
        self._run_handler(request)
        self.assertEqual(
            self._get_read_hyperparameters_call_filters(),
            [
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam1",
                    filter_type=provider.HyperparameterFilterType.INTERVAL,
                    filter=(0.1, 0.2),
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam2",
                    filter_type=provider.HyperparameterFilterType.INTERVAL,
                    filter=(0.1, float("inf")),
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam3",
                    filter_type=provider.HyperparameterFilterType.INTERVAL,
                    filter=(float("-inf"), 0.2),
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam4",
                    filter_type=provider.HyperparameterFilterType.INTERVAL,
                    filter=(0.0, 0.0),
                ),
            ],
        )

    def test_experiment_from_data_provider_sends_discrete_filter(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        request = """
            col_params: {
              hparam: 'hparam1'
              filter_discrete: {
                values: {
                  bool_value: true
                }
                values: {
                  bool_value: false
                }
              }
            }
            col_params: {
              hparam: 'hparam2'
              filter_discrete: {
                values: {
                  number_value: 2.0
                }
              }
            }
            col_params: {
              hparam: 'hparam3'
              filter_discrete: {
                values: {
                  string_value: '3_string'
                }
              }
            }
            col_params: {
              hparam: 'hparam4'
              filter_discrete: {
                values: {
                  string_value: '4_string'
                }
                values: {
                  bool_value: true
                }
                values: {
                  number_value: 4.0
                }
              }
            }
            col_params: {
              hparam: 'hparam5'
              filter_discrete: {}
            }
        """
        self._run_handler(request)

        self.assertEqual(
            self._get_read_hyperparameters_call_filters(),
            [
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam1",
                    filter_type=provider.HyperparameterFilterType.DISCRETE,
                    filter=[True, False],
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam2",
                    filter_type=provider.HyperparameterFilterType.DISCRETE,
                    filter=[2.0],
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam3",
                    filter_type=provider.HyperparameterFilterType.DISCRETE,
                    filter=["3_string"],
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam4",
                    filter_type=provider.HyperparameterFilterType.DISCRETE,
                    filter=["4_string", True, 4.0],
                ),
                provider.HyperparameterFilter(
                    hyperparameter_name="hparam5",
                    filter_type=provider.HyperparameterFilterType.DISCRETE,
                    filter=[],
                ),
            ],
        )

    def test_experiment_from_data_provider_does_not_send_metric_filters(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        request = """
            col_params: {
              metric: { tag: 'delta_temp' }
              filter_interval: {
                  min_value: 0
                  max_value: 100
              }
            }
        """
        self._run_handler(request)

        self.assertEmpty(self._get_read_hyperparameters_call_filters())

    def test_experiment_from_data_provider_sends_sort(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        request = """
            col_params: {
              hparam: 'hparam1'
              order: ORDER_ASC
            }
            col_params: {
              hparam: 'hparam2'
              order: ORDER_UNSPECIFIED
            }
            col_params: {
              hparam: 'hparam3'
              order: ORDER_DESC
            }
        """
        self._run_handler(request)
        self.assertEqual(
            self._get_read_hyperparameters_call_sort(),
            [
                provider.HyperparameterSort(
                    hyperparameter_name="hparam1",
                    sort_direction=provider.HyperparameterSortDirection.ASCENDING,
                ),
                provider.HyperparameterSort(
                    hyperparameter_name="hparam3",
                    sort_direction=provider.HyperparameterSortDirection.DESCENDING,
                ),
            ],
        )

    def test_experiment_from_data_provider_with_no_sessions_or_hparam_values(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run="run1"
                ),
                sessions=[],
                hyperparameter_values=[],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1/run1"
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_with_no_run_in_root(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[],
                hyperparameter_values=[],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1"
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_with_sessions(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="exp1", run="run1/train"
                    ),
                    provider.HyperparameterSessionRun(
                        experiment_id="exp1", run="run1/validate"
                    ),
                    provider.HyperparameterSessionRun(
                        experiment_id="exp1", run="run2/train"
                    ),
                    provider.HyperparameterSessionRun(
                        experiment_id="exp1", run="run2/validate"
                    ),
                ],
                hyperparameter_values=[],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1"
                  sessions: {
                    name: "exp1/run1/train"
                  }
                  sessions: {
                    name: "exp1/run1/validate"
                  }
                  sessions: {
                    name: "exp1/run2/train"
                  }
                  sessions: {
                    name: "exp1/run2/validate"
                  }
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_with_string_value(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[],
                hyperparameter_values=[
                    provider.HyperparameterValue(
                        hyperparameter_name="hparam",
                        domain_type=provider.HyperparameterDomainType.DISCRETE_STRING,
                        value="string_value",
                    ),
                ],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1"
                  hparams {
                    key: 'hparam'
                    value: {
                      string_value: 'string_value'
                    }
                  }
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_with_float_value(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[],
                hyperparameter_values=[
                    provider.HyperparameterValue(
                        hyperparameter_name="hparam1",
                        domain_type=provider.HyperparameterDomainType.DISCRETE_FLOAT,
                        value=1.11,
                    ),
                    provider.HyperparameterValue(
                        hyperparameter_name="hparam2",
                        domain_type=provider.HyperparameterDomainType.INTERVAL,
                        value=2.22,
                    ),
                ],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1"
                  hparams {
                    key: 'hparam1'
                    value: {
                      number_value: 1.11
                    }
                  }
                  hparams {
                    key: 'hparam2'
                    value: {
                      number_value: 2.22
                    }
                  }
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_with_bool_value(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[],
                hyperparameter_values=[
                    provider.HyperparameterValue(
                        hyperparameter_name="hparam1",
                        domain_type=provider.HyperparameterDomainType.DISCRETE_BOOL,
                        value=True,
                    ),
                    provider.HyperparameterValue(
                        hyperparameter_name="hparam2",
                        domain_type=provider.HyperparameterDomainType.DISCRETE_BOOL,
                        value=False,
                    ),
                ],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1"
                  hparams {
                    key: 'hparam1'
                    value: {
                      bool_value: true
                    }
                  }
                  hparams {
                    key: 'hparam2'
                    value: {
                      bool_value: false
                    }
                  }
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_with_no_domain(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[],
                hyperparameter_values=[
                    provider.HyperparameterValue(hyperparameter_name="hparam"),
                ],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertProtoEquals(
            """
                session_groups {
                  name: "exp1"
                  hparams {
                    key: 'hparam'
                  }
                }
                total_size: 1
            """,
            response,
        )

    def test_experiment_from_data_provider_start_index_and_slize_size(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp1", run=""
                ),
                sessions=[],
                hyperparameter_values=[],
            ),
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp2", run=""
                ),
                sessions=[],
                hyperparameter_values=[],
            ),
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp3", run=""
                ),
                sessions=[],
                hyperparameter_values=[],
            ),
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="exp4", run=""
                ),
                sessions=[],
                hyperparameter_values=[],
            ),
        ]

        with self.subTest("selects_all"):
            request = """
                start_index: 0
                slice_size: 10
            """
            response = self._run_handler(request)
            self.assertProtoEquals(
                """
                    session_groups {
                      name: "exp1"
                    }
                    session_groups {
                      name: "exp2"
                    }
                    session_groups {
                      name: "exp3"
                    }
                    session_groups {
                      name: "exp4"
                    }
                    total_size: 4
                """,
                response,
            )

        with self.subTest("selects_start_slice"):
            request = """
                start_index: 0
                slice_size: 2
            """
            response = self._run_handler(request)
            self.assertProtoEquals(
                """
                    session_groups {
                      name: "exp1"
                    }
                    session_groups {
                      name: "exp2"
                    }
                    total_size: 4
                """,
                response,
            )

        with self.subTest("selects_middle_slice"):
            request = """
                start_index: 1
                slice_size: 2
            """
            response = self._run_handler(request)
            self.assertProtoEquals(
                """
                    session_groups {
                      name: "exp2"
                    }
                    session_groups {
                      name: "exp3"
                    }
                    total_size: 4
                """,
                response,
            )

        with self.subTest("selects_end_slice"):
            request = """
                start_index: 3
                slice_size: 3
            """
            response = self._run_handler(request)
            self.assertProtoEquals(
                """
                    session_groups {
                      name: "exp4"
                    }
                    total_size: 4
                """,
                response,
            )

        with self.subTest("selects_none"):
            request = """
                start_index: 4
                slice_size: 2
            """
            response = self._run_handler(request)
            self.assertProtoEquals(
                """
                    total_size: 4
                """,
                response,
            )

    def test_experiment_from_data_provider_with_metric_values_from_experiment_id(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                # The sessions names correspond to return values from
                # _mock_list_scalars() and _mock_read_last_scalars() in order to
                # generate metric infos and values.
                root=provider.HyperparameterSessionRun(
                    experiment_id="session_2", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="session_2", run=""
                    )
                ],
                hyperparameter_values=[],
            ),
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertLen(response.session_groups, 1)
        self.assertEqual("session_2", response.session_groups[0].name)
        self.assertLen(response.session_groups[0].sessions, 1)
        self.assertProtoEquals(
            """
              name: "session_2"
              metric_values {
                name {
                  tag: "current_temp"
                }
                value: 100.0
                training_step: 1
                wall_time_secs: 1.0
              }
              metric_values {
                name {
                  tag: "delta_temp"
                }
                value: 150.0
                training_step: 3
                wall_time_secs: 11.0
              }
            """,
            response.session_groups[0].sessions[0],
        )

    def test_experiment_from_data_provider_with_metric_values_from_run_name(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                # The sessions names correspond to return values from
                # _mock_list_scalars() and _mock_read_last_scalars() in order to
                # generate metric infos and values.
                root=provider.HyperparameterSessionRun(
                    experiment_id="", run="session_2"
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="", run="session_2"
                    )
                ],
                hyperparameter_values=[],
            ),
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertLen(response.session_groups, 1)
        self.assertEqual("session_2", response.session_groups[0].name)
        self.assertLen(response.session_groups[0].sessions, 1)
        self.assertProtoEquals(
            """
              name: "session_2"
              metric_values {
                name {
                  tag: "current_temp"
                }
                value: 100.0
                training_step: 1
                wall_time_secs: 1.0
              }
              metric_values {
                name {
                  tag: "delta_temp"
                }
                value: 150.0
                training_step: 3
                wall_time_secs: 11.0
              }
            """,
            response.session_groups[0].sessions[0],
        )

    def test_experiment_from_data_provider_with_metric_values_empty_session_names(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(experiment_id="", run="")
                ],
                hyperparameter_values=[],
            ),
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertLen(response.session_groups, 1)
        # The name comes from the experiment id.
        self.assertEqual(response.session_groups[0].name, "123")
        self.assertLen(response.session_groups[0].sessions, 1)
        self.assertEqual(response.session_groups[0].sessions[0].name, "")
        # The result specifies a single session without explicit identifier. It
        # therefore represents a session that includes all run/tag combinations
        # as separate metric values.
        # There are 11 total run/tag combinations across session_1, _2, _3, _4,
        # and _5.
        self.assertLen(response.session_groups[0].metric_values, 11)
        self.assertLen(response.session_groups[0].sessions[0].metric_values, 11)

    def test_experiment_from_data_provider_with_metric_values_aggregates(
        self,
    ):
        # Aggregations are tested in-depth elsewhere using the Tensor-based
        # hparams. For DataProvider-based hparam tests we just test one
        # aggregation to verify the aggregation logic is being applied.
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                # The sessions names correspond to return values from
                # _mock_list_scalars() and _mock_read_last_scalars() in order to
                # generate metric infos and values.
                root=provider.HyperparameterSessionRun(
                    experiment_id="", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="", run="session_1"
                    ),
                    provider.HyperparameterSessionRun(
                        experiment_id="", run="session_2"
                    ),
                    provider.HyperparameterSessionRun(
                        experiment_id="", run="session_3"
                    ),
                ],
                hyperparameter_values=[],
            )
        ]
        request = """
            start_index: 0
            slice_size: 10
            aggregation_type: AGGREGATION_AVG
        """
        response = self._run_handler(request)
        self.assertLen(response.session_groups[0].metric_values, 3)
        self.assertProtoEquals(
            """
              name {
                tag: "current_temp"
              }
              value: 37.0
              training_step: 1
              wall_time_secs: 1.0
            """,
            response.session_groups[0].metric_values[0],
        )
        self.assertProtoEquals(
            """
              name {
                tag: "delta_temp"
              }
              value: 55.5
              training_step: 2
              wall_time_secs: 10.3333333
            """,
            response.session_groups[0].metric_values[1],
        )
        self.assertProtoEquals(
            """
              name {
                tag: "optional_metric"
              }
              value: 33.0
              training_step: 20
              wall_time_secs: 2.0
            """,
            response.session_groups[0].metric_values[2],
        )

    def test_experiment_from_data_provider_filters_by_metric_values(
        self,
    ):
        # Filters are tested in-depth elsewhere using the Tensor-based hparams.
        # For DataProvider-based hparam tests we just test one filter to verify
        # the filter logic is being applied.
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            # The sessions names correspond to return values from
            # _mock_list_scalars() and _mock_read_last_scalars() in order to
            # generate metric infos and values.
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="session_1", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="session_1", run=""
                    )
                ],
                hyperparameter_values=[],
            ),
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="session_2", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="session_2", run=""
                    )
                ],
                hyperparameter_values=[],
            ),
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="session_3", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="session_3", run=""
                    )
                ],
                hyperparameter_values=[],
            ),
        ]
        request = """
            start_index: 0
            slice_size: 10
        """
        response = self._run_handler(request)
        self.assertLen(response.session_groups, 3)
        self.assertEqual("session_1", response.session_groups[0].name)
        self.assertEqual("session_2", response.session_groups[1].name)
        self.assertEqual("session_3", response.session_groups[2].name)

        filtered_request = """
            start_index: 0
            slice_size: 10
            col_params: {
              metric: { tag: 'delta_temp' }
              filter_interval: {
                  min_value: 0
                  max_value: 100
              }
            }
        """
        filtered_response = self._run_handler(filtered_request)
        # The delta_temp values for session_1, session_2, and session_3 are
        # 10, 150, and 1.5, respectively. We expect session_2 to have been
        # filtered out.
        self.assertLen(filtered_response.session_groups, 2)
        self.assertEqual("session_1", filtered_response.session_groups[0].name)
        self.assertEqual("session_3", filtered_response.session_groups[1].name)

    def test_experiment_from_data_provider_does_not_filter_by_hparam_values(
        self,
    ):
        # We assume the DataProvider will apply hparam filters and we do not
        # attempt to reapply them.
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                root=provider.HyperparameterSessionRun(
                    experiment_id="session_1", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="session_1", run=""
                    )
                ],
                hyperparameter_values=[
                    provider.HyperparameterValue(
                        hyperparameter_name="hparam1",
                        domain_type=provider.HyperparameterDomainType.INTERVAL,
                        value=-1.0,
                    ),
                ],
            ),
        ]
        request = """
            start_index: 0
            slice_size: 10
            col_params: {
              hparam: 'hparam1'
              filter_interval: {
                  min_value: 0
                  max_value: 100
              }
            }
        """
        response = self._run_handler(request)
        # The one result from the DataProvider call is returned even though
        # there is an hparam filter that it should not pass. This indicates we
        # are purposefully not applying the hparam filters.
        #
        # Note: The scenario should not happen in practice as we'd expect
        # the DataProvider to have successfully applied the filter.
        self.assertLen(response.session_groups, 1)
        self.assertEqual("session_1", response.session_groups[0].name)

    def test_experiment_from_data_provider_include_metrics(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = [
            provider.HyperparameterSessionGroup(
                # The sessions names correspond to return values from
                # _mock_list_scalars() and _mock_read_last_scalars() in order to
                # generate metric infos and values.
                root=provider.HyperparameterSessionRun(
                    experiment_id="session_2", run=""
                ),
                sessions=[
                    provider.HyperparameterSessionRun(
                        experiment_id="session_2", run=""
                    )
                ],
                hyperparameter_values=[],
            ),
        ]

        with self.subTest("False"):
            request = """
                start_index: 0
                slice_size: 10
                include_metrics: False
            """
            response = self._run_handler(request)
            self.assertEmpty(response.session_groups[0].metric_values, 0)
            self.assertEmpty(
                response.session_groups[0].sessions[0].metric_values, 0
            )

        with self.subTest("True"):
            request = """
                start_index: 0
                slice_size: 10
                include_metrics: True
            """
            response = self._run_handler(request)
            self.assertLen(response.session_groups[0].metric_values, 2)
            self.assertLen(
                response.session_groups[0].sessions[0].metric_values, 2
            )

        with self.subTest("unspecified"):
            request = """
                start_index: 0
                slice_size: 10
            """
            response = self._run_handler(request)
            self.assertLen(response.session_groups[0].metric_values, 2)
            self.assertLen(
                response.session_groups[0].sessions[0].metric_values, 2
            )

    def test_experiment_from_data_provider_sends_hparams_include_in_result(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        request = """
            col_params: {
              hparam: 'hparam1'
              include_in_result: True
            }
            col_params: {
              hparam: 'hparam2'
              include_in_result: False
            }
            col_params: {
              hparam: 'hparam3'
            }
            col_params: {
              hparam: 'hparam4'
              include_in_result: True
            }
            col_params: {
              metric: {tag: 'metric1'}
              include_in_result: True
            }
        """
        self._run_handler(request)
        self.assertCountEqual(
            self._get_read_hyperparameters_call_hparams_to_include(),
            ["hparam1", "hparam3", "hparam4"],
        )

    def _run_handler(self, request):
        request_proto = api_pb2.ListSessionGroupsRequest()
        text_format.Merge(request, request_proto)
        handler = list_session_groups.Handler(
            backend_context=backend_context.Context(self._mock_tb_context),
            request_context=context.RequestContext(),
            experiment_id="123",
            request=request_proto,
        )
        response = handler.run()
        # Sort the metric values repeated field in each session group to
        # canonicalize the response.
        for group in response.session_groups:
            group.metric_values.sort(key=operator.attrgetter("name.tag"))
        return response

    def _verify_handler(
        self, request, expected_session_group_names, expected_total_size
    ):
        response = self._run_handler(request)
        self.assertEqual(
            expected_session_group_names,
            [sg.name for sg in response.session_groups],
        )
        self.assertEqual(expected_total_size, response.total_size)

    def _serialized_plugin_data(self, data_oneof_field, text_protobuffer):
        oneof_type_dict = {
            DATA_TYPE_EXPERIMENT: api_pb2.Experiment,
            DATA_TYPE_SESSION_START_INFO: plugin_data_pb2.SessionStartInfo,
            DATA_TYPE_SESSION_END_INFO: plugin_data_pb2.SessionEndInfo,
        }
        protobuffer = text_format.Merge(
            text_protobuffer, oneof_type_dict[data_oneof_field]()
        )
        plugin_data = plugin_data_pb2.HParamsPluginData()
        getattr(plugin_data, data_oneof_field).CopyFrom(protobuffer)
        return metadata.create_summary_metadata(plugin_data).plugin_data.content

    def _get_read_hyperparameters_call_filters(self):
        call_args = (
            self._mock_tb_context.data_provider.read_hyperparameters.call_args
        )
        return call_args[1]["filters"]

    def _get_read_hyperparameters_call_sort(self):
        call_args = (
            self._mock_tb_context.data_provider.read_hyperparameters.call_args
        )
        return call_args[1]["sort"]

    def _get_read_hyperparameters_call_hparams_to_include(self):
        call_args = (
            self._mock_tb_context.data_provider.read_hyperparameters.call_args
        )
        return call_args[1]["hparams_to_include"]


def _reduce_session_group_to_names(session_group):
    return [session.name for session in session_group.sessions]


def _reduce_to_names(session_groups):
    return [
        (session_group.name, _reduce_session_group_to_names(session_group))
        for session_group in session_groups
    ]


if __name__ == "__main__":
    tf.test.main()
