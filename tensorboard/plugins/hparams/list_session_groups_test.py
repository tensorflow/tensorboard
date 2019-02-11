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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import operator

import tensorflow as tf
try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

from google.protobuf import text_format
from tensorboard.backend.event_processing import event_accumulator
from tensorboard.backend.event_processing import plugin_event_multiplexer
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import list_session_groups
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2


DATA_TYPE_EXPERIMENT = 'experiment'
DATA_TYPE_SESSION_START_INFO = 'session_start_info'
DATA_TYPE_SESSION_END_INFO = 'session_end_info'


# Allow us to abbreviate event_accumulator.TensorEvent
TensorEvent = event_accumulator.TensorEvent  # pylint: disable=invalid-name


class ListSessionGroupsTest(tf.test.TestCase):
  # Make assertProtoEquals print all the diff.
  maxDiff = None  # pylint: disable=invalid-name

  def setUp(self):
    self._mock_tb_context = mock.create_autospec(
        base_plugin.TBContext)
    self._mock_multiplexer = mock.create_autospec(
        plugin_event_multiplexer.EventMultiplexer)
    self._mock_tb_context.multiplexer = self._mock_multiplexer
    self._mock_multiplexer.PluginRunToTagToContent.return_value = {
        '': {
            metadata.EXPERIMENT_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_EXPERIMENT, '''
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
                  ''')
        },
        'session_1': {
            metadata.SESSION_START_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_START_INFO, '''
                  hparams:{ key: 'initial_temp' value: { number_value: 270 } },
                  hparams:{ key: 'final_temp' value: { number_value: 150 } },
                  hparams:{
                    key: 'string_hparam' value: { string_value: 'a string' }
                  },
                  hparams:{ key: 'bool_hparam' value: { bool_value: true } }
                  group_name: 'group_1'
                  start_time_secs: 314159
                '''),
            metadata.SESSION_END_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                  status: STATUS_SUCCESS
                  end_time_secs: 314164
                ''')
        },
        'session_2': {
            metadata.SESSION_START_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_START_INFO, '''
                  hparams:{ key: 'initial_temp' value: { number_value: 280 } },
                  hparams:{ key: 'final_temp' value: { number_value: 100 } },
                  hparams:{
                    key: 'string_hparam' value: { string_value: 'AAAAA' }
                  },
                  hparams:{ key: 'bool_hparam' value: { bool_value: false } }
                  group_name: 'group_2'
                  start_time_secs: 314159
                '''),
            metadata.SESSION_END_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                   status: STATUS_SUCCESS
                   end_time_secs: 314164
                ''')
        },
        'session_3': {
            metadata.SESSION_START_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_START_INFO, '''
                  hparams:{ key: 'initial_temp' value: { number_value: 280 } },
                  hparams:{ key: 'final_temp' value: { number_value: 100 } },
                  hparams:{
                    key: 'string_hparam' value: { string_value: 'AAAAA' }
                  },
                  hparams:{ key: 'bool_hparam' value: { bool_value: false } }
                  group_name: 'group_2'
                  start_time_secs: 314159
                '''),
            metadata.SESSION_END_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                  status: STATUS_FAILURE
                  end_time_secs: 314164
                ''')
        },
        'session_4': {
            metadata.SESSION_START_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_START_INFO, '''
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
                '''),
            metadata.SESSION_END_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                  status: STATUS_UNKNOWN
                  end_time_secs: 314164
                ''')
        },
        'session_5': {
            metadata.SESSION_START_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_START_INFO, '''
                  hparams:{ key: 'initial_temp' value: { number_value: 280 } },
                  hparams:{ key: 'final_temp' value: { number_value: 100 } },
                  hparams:{
                    key: 'string_hparam' value: { string_value: 'AAAAA' }
                  },
                  hparams:{ key: 'bool_hparam' value: { bool_value: false } }
                  group_name: 'group_2'
                  start_time_secs: 314159
                '''),
            metadata.SESSION_END_INFO_TAG:
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                  status: STATUS_SUCCESS
                  end_time_secs: 314164
                ''')
        },
    }
    self._mock_multiplexer.Tensors.side_effect = self._mock_tensors

  # A mock version of EventMultiplexer.Tensors
  def _mock_tensors(self, run, tag):
    result_dict = {
        'session_1': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(10.0))
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(20.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.compat.v1.make_tensor_proto(15.0))
            ],
            'optional_metric': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(20.0)),
                TensorEvent(
                    wall_time=2, step=20,
                    tensor_proto=tf.compat.v1.make_tensor_proto(33.0))
            ]
        },
        'session_2': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(100.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(200.0)),
                TensorEvent(
                    wall_time=11, step=3,
                    tensor_proto=tf.compat.v1.make_tensor_proto(150.0))
            ]
        },
        'session_3': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(1.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(2.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.compat.v1.make_tensor_proto(1.5))
            ]
        },
        'session_4': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(101.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(201.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.compat.v1.make_tensor_proto(-151.0))
            ]
        },
        'session_5': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(52.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.compat.v1.make_tensor_proto(2.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.compat.v1.make_tensor_proto(-18))
            ]
        },
    }
    return result_dict[run][tag]

  def test_empty_request(self):
    # Since we don't allow any statuses, result should be empty.
    self.assertProtoEquals('total_size: 0',
                           self._run_handler(request=''))

  def test_no_filter_no_sort(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_AVG
    '''
    response = self._run_handler(request)
    self.assertProtoEquals(
        '''
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
        ''',
        response)

  def test_no_allowed_statuses(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: []
      aggregation_type: AGGREGATION_AVG
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups), 0)

  def test_some_allowed_statuses(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN, STATUS_SUCCESS]
      aggregation_type: AGGREGATION_AVG
    '''
    response = self._run_handler(request)
    self.assertEquals(
        _reduce_to_names(response.session_groups),
        [('group_1', ['session_1']),
         ('group_2', ['session_2', 'session_5']),
         ('group_3', ['session_4'])])

  def test_some_allowed_statuses_empty_groups(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_FAILURE]
      aggregation_type: AGGREGATION_AVG
    '''
    response = self._run_handler(request)
    self.assertEquals(
        _reduce_to_names(response.session_groups),
        [('group_2', ['session_3'])])

  def test_aggregation_median_current_temp(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_MEDIAN
      aggregation_metric: { tag: "current_temp" }
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups[1].metric_values), 2)
    self.assertProtoEquals(
        '''name { tag: "current_temp" }
           value: 52.0
           training_step: 1
           wall_time_secs: 1.0''',
        response.session_groups[1].metric_values[0])
    self.assertProtoEquals(
        '''name { tag: "delta_temp" }
           value: -18.0
           training_step: 2
           wall_time_secs: 10.0''',
        response.session_groups[1].metric_values[1])

  def test_aggregation_median_delta_temp(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_MEDIAN
      aggregation_metric: { tag: "delta_temp" }
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups[1].metric_values), 2)
    self.assertProtoEquals(
        '''name { tag: "current_temp" }
           value: 1.0
           training_step: 1
           wall_time_secs: 1.0''',
        response.session_groups[1].metric_values[0])
    self.assertProtoEquals(
        '''name { tag: "delta_temp" }
           value: 1.5
           training_step: 2
           wall_time_secs: 10.0''',
        response.session_groups[1].metric_values[1])

  def test_aggregation_max_current_temp(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_MAX
      aggregation_metric: { tag: "current_temp" }
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups[1].metric_values), 2)
    self.assertProtoEquals(
        '''name { tag: "current_temp" }
           value: 100
           training_step: 1
           wall_time_secs: 1.0''',
        response.session_groups[1].metric_values[0])
    self.assertProtoEquals(
        '''name { tag: "delta_temp" }
           value: 150.0
           training_step: 3
           wall_time_secs: 11.0''',
        response.session_groups[1].metric_values[1])

  def test_aggregation_max_delta_temp(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_MAX
      aggregation_metric: { tag: "delta_temp" }
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups[1].metric_values), 2)
    self.assertProtoEquals(
        '''name { tag: "current_temp" }
           value: 100.0
           training_step: 1
           wall_time_secs: 1.0''',
        response.session_groups[1].metric_values[0])
    self.assertProtoEquals(
        '''name { tag: "delta_temp" }
           value: 150.0
           training_step: 3
           wall_time_secs: 11.0''',
        response.session_groups[1].metric_values[1])

  def test_aggregation_min_current_temp(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_MIN
      aggregation_metric: { tag: "current_temp" }
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups[1].metric_values), 2)
    self.assertProtoEquals(
        '''name { tag: "current_temp" }
           value: 1.0
           training_step: 1
           wall_time_secs: 1.0''',
        response.session_groups[1].metric_values[0])
    self.assertProtoEquals(
        '''name { tag: "delta_temp" }
           value: 1.5
           training_step: 2
           wall_time_secs: 10.0''',
        response.session_groups[1].metric_values[1])

  def test_aggregation_min_delta_temp(self):
    request = '''
      start_index: 0
      slice_size: 3
      allowed_statuses: [STATUS_UNKNOWN,
                         STATUS_SUCCESS,
                         STATUS_FAILURE,
                         STATUS_RUNNING]
      aggregation_type: AGGREGATION_MIN
      aggregation_metric: { tag: "delta_temp" }
    '''
    response = self._run_handler(request)
    self.assertEquals(len(response.session_groups[1].metric_values), 2)
    self.assertProtoEquals(
        '''name { tag: "current_temp" }
           value: 52.0
           training_step: 1
           wall_time_secs: 1.0''',
        response.session_groups[1].metric_values[0])
    self.assertProtoEquals(
        '''name { tag: "delta_temp" }
           value: -18.0
           training_step: 2
           wall_time_secs: 10.0''',
        response.session_groups[1].metric_values[1])

  def test_no_filter_no_sort_partial_slice(self):
    self._verify_handler(
        request='''
          start_index: 1
          slice_size: 1
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
        ''',
        expected_session_group_names=['group_2'],
        expected_total_size=3)

  def test_no_filter_exclude_missing_values(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            exclude_missing_values: true
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1'],
        expected_total_size=1)

  def test_filter_regexp(self):
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            filter_regexp: 'AA'
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_2'],
        expected_total_size=1)
    # Test filtering out all session groups.
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            filter_regexp: 'a string_100'
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=[],
        expected_total_size=0)

  def test_filter_interval(self):
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'initial_temp'
            filter_interval: { min_value: 270 max_value: 282 }
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1', 'group_2'],
        expected_total_size=2)

  def test_filter_discrete_set(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'current_temp' }
            filter_discrete: { values: [{ number_value: 101.0 },
                                        { number_value: 10.0 }] }
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1', 'group_3'],
        expected_total_size=2)

  def test_filter_multiple_columns(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'current_temp' }
            filter_discrete: { values: [{ number_value: 101.0 },
                                        { number_value: 10.0 }] }
          }
          col_params: {
            hparam: 'initial_temp'
            filter_interval: { min_value: 270 max_value: 282 }
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1'],
        expected_total_size=1)

  def test_filter_single_column_with_missing_values(self):
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            filter_regexp: 'B'
            exclude_missing_values: true
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_3'],
        expected_total_size=1)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            filter_regexp: 'B'
            exclude_missing_values: false
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1', 'group_2', 'group_3'],
        expected_total_size=3)

    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            filter_discrete: { values: { number_value: 33.0 } }
            exclude_missing_values: true
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1'],
        expected_total_size=1)

  def test_sort_one_column(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'delta_temp' }
            order: ORDER_ASC
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_3', 'group_1', 'group_2'],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            order: ORDER_ASC
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_2', 'group_1', 'group_3'],
        expected_total_size=3)
    # Test descending order.
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            order: ORDER_DESC
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_3', 'group_1', 'group_2'],
        expected_total_size=3)

  def test_sort_multiple_columns(self):
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'bool_hparam'
            order: ORDER_ASC
          }
          col_params: {
            metric: { tag: 'delta_temp' }
            order: ORDER_ASC
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_2', 'group_3', 'group_1'],
        expected_total_size=3)
    # Primary key in descending order. Secondary key in ascending order.
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'bool_hparam'
            order: ORDER_DESC
          }
          col_params: {
            metric: { tag: 'delta_temp' }
            order: ORDER_ASC
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_3', 'group_1', 'group_2'],
        expected_total_size=3)

  def test_sort_one_column_with_missing_values(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            order: ORDER_ASC
            missing_values_first: false
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1', 'group_2', 'group_3'],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            order: ORDER_ASC
            missing_values_first: true
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_2', 'group_3', 'group_1'],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            order: ORDER_ASC
            missing_values_first: false
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_3', 'group_1', 'group_2'],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            order: ORDER_ASC
            missing_values_first: true
          }
          allowed_statuses: [STATUS_UNKNOWN,
                             STATUS_SUCCESS,
                             STATUS_FAILURE,
                             STATUS_RUNNING]
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=['group_1', 'group_2', 'group_3'],
        expected_total_size=3)

  def _run_handler(self, request):
    request_proto = api_pb2.ListSessionGroupsRequest()
    text_format.Merge(request, request_proto)
    handler = list_session_groups.Handler(
        backend_context.Context(self._mock_tb_context),
        request_proto)
    response = handler.run()
    # Sort the metric values repeated field in each session group to
    # canonicalize the response.
    for group in response.session_groups:
      group.metric_values.sort(key=operator.attrgetter('name.tag'))
    return response

  def _verify_handler(
      self, request, expected_session_group_names, expected_total_size):
    response = self._run_handler(request)
    self.assertEqual(expected_session_group_names,
                     [sg.name for sg in response.session_groups])
    self.assertEqual(expected_total_size, response.total_size)

  def _serialized_plugin_data(self, data_oneof_field, text_protobuffer):
    oneof_type_dict = {
        DATA_TYPE_EXPERIMENT: api_pb2.Experiment,
        DATA_TYPE_SESSION_START_INFO: plugin_data_pb2.SessionStartInfo,
        DATA_TYPE_SESSION_END_INFO: plugin_data_pb2.SessionEndInfo
    }
    protobuffer = text_format.Merge(text_protobuffer,
                                    oneof_type_dict[data_oneof_field]())
    plugin_data = plugin_data_pb2.HParamsPluginData()
    getattr(plugin_data, data_oneof_field).CopyFrom(protobuffer)
    return metadata.create_summary_metadata(plugin_data).plugin_data.content


def _reduce_session_group_to_names(session_group):
  return [session.name for session in session_group.sessions]


def _reduce_to_names(session_groups):
  return [(session_group.name, _reduce_session_group_to_names(session_group))
          for session_group in session_groups]


if __name__ == '__main__':
  tf.test.main()
