# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

from google.protobuf import text_format
import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_multiplexer
from tensorboard.backend.event_processing import event_accumulator
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import list_session_groups
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2

DATA_TYPE_EXPERIMENT = 'experiment'
DATA_TYPE_SESSION_START_INFO = 'session_start_info'
DATA_TYPE_SESSION_END_INFO = 'session_end_info'

TensorEvent = event_accumulator.TensorEvent

class ListSessionGroupsTest(tf.test.TestCase):

  def __init__(self, methodName='runTest'):
    super(ListSessionGroupsTest, self).__init__(methodName)
    # Make assertProtoEquals print all the diff.
    self.maxDiff = None

  def setUp(self):
    self._mock_tb_context = tf.test.mock.create_autospec(
        base_plugin.TBContext)
    self._mock_multiplexer = tf.test.mock.create_autospec(
        plugin_event_multiplexer.EventMultiplexer)
    self._mock_tb_context.multiplexer = self._mock_multiplexer
    self._mock_multiplexer.PluginRunToTagToContent.return_value = {
        '' : {
            metadata.EXPERIMENT_TAG :
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
        'session_1' : {
            metadata.SESSION_START_INFO_TAG :
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
            metadata.SESSION_END_INFO_TAG :
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                  status: STATUS_SUCCESS
                  end_time_secs: 314164
                ''')
        },
        'session_2' : {
            metadata.SESSION_START_INFO_TAG :
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
            metadata.SESSION_END_INFO_TAG :
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                   status: STATUS_SUCCESS
                   end_time_secs: 314164
                ''')
        },
        'session_3' : {
            metadata.SESSION_START_INFO_TAG :
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
            metadata.SESSION_END_INFO_TAG :
            self._serialized_plugin_data(
                DATA_TYPE_SESSION_END_INFO, '''
                  status: STATUS_SUCCESS
                  end_time_secs: 314164
                ''')
        },
        'session_4' : {
            metadata.SESSION_START_INFO_TAG :
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
            metadata.SESSION_END_INFO_TAG :
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
                    tensor_proto=tf.make_tensor_proto(10.0))
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(20.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.make_tensor_proto(15.0))
            ],
            'optional_metric' : [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(20.0)),
                TensorEvent(
                    wall_time=2, step=20,
                    tensor_proto=tf.make_tensor_proto(33.0))
            ]
        },
        'session_2': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(100.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(200.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.make_tensor_proto(150.0))
            ]
        },
        'session_3': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(1.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(2.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.make_tensor_proto(1.5))
            ]
        },
        'session_4': {
            'current_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(101.0)),
            ],
            'delta_temp': [
                TensorEvent(
                    wall_time=1, step=1,
                    tensor_proto=tf.make_tensor_proto(201.0)),
                TensorEvent(
                    wall_time=10, step=2,
                    tensor_proto=tf.make_tensor_proto(-151.0))
            ]
        },
    }
    return result_dict[run][tag]

  def test_empty_request(self):
    self._verify_full_response(
        request='',
        expected_response='''
          total_size: 3
        ''')

  def test_no_filter_no_sort(self):
    self._verify_full_response(
        request='''
          start_index: 0
          slice_size: 3
        ''',
        expected_response='''
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
              metric_values { name { tag: "delta_temp" } value: 15
                training_step: 2
                wall_time_secs: 10.0
              }

              metric_values { name { tag: "optional_metric" } value: 33
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
              value: 100
              training_step: 1
              wall_time_secs: 1.0
            }
            metric_values { name { tag: "delta_temp" } value: 150
              training_step: 2
              wall_time_secs: 10.0
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
              metric_values { name { tag: "delta_temp" } value: 150
                training_step: 2
                wall_time_secs: 10.0
              }
            }
            sessions {
              name: "session_3"
              start_time_secs: 314159
              end_time_secs: 314164
              status: STATUS_SUCCESS
              metric_values {
                name { tag: "current_temp" }
                value: 1.0
                training_step: 1
                wall_time_secs: 1.0
              }
              metric_values { name { tag: "delta_temp" } value: 1.5
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
              status: STATUS_SUCCESS
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
        ''')

  def test_no_filter_no_sort_partial_slice(self):
    self._verify_handler(
        request='''
          start_index: 1
          slice_size: 1
        ''',
        expected_session_group_names=["group_2"],
        expected_total_size=3)

  def test_filter_regexp(self):
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            filter_regexp: 'AA*'
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_2"],
        expected_total_size=1)
    # Test filtering out all session groups.
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            filter_regexp: 'a string_100'
          }
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
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1", "group_2"],
        expected_total_size=2)

  def test_filter_discrete_set(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'current_temp' }
            filter_discrete: { values: [{ number_value: 101.0 },
                                        { number_value: 10.0 }] }
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1", "group_3"],
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
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1"],
        expected_total_size=1)

  def test_filter_single_column_with_missing_values(self):
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            filter_regexp: 'B*'
            exclude_missing_values: true
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_3"],
        expected_total_size=1)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            filter_regexp: 'B*'
            exclude_missing_values: false
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1", "group_2", "group_3"],
        expected_total_size=3)

    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            filter_discrete: { values: { number_value: 33.0 } }
            exclude_missing_values: true
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1"],
        expected_total_size=1)

  def test_sort_one_column(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'delta_temp' }
            order: ORDER_ASC
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_3", "group_1", "group_2"],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            order: ORDER_ASC
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_2", "group_1", "group_3"],
        expected_total_size=3)
    # Test descending order.
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'string_hparam'
            order: ORDER_DESC
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_3", "group_1", "group_2"],
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
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_2", "group_3", "group_1"],
        expected_total_size=3)
    #Primary key in descending order. Secondary key in ascending order.
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
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_3", "group_1", "group_2"],
        expected_total_size=3)

  def test_sort_one_column_with_missing_values(self):
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            order: ORDER_ASC
            missing_values_first: false
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1", "group_2", "group_3"],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            metric: { tag: 'optional_metric' }
            order: ORDER_ASC
            missing_values_first: true
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_2", "group_3", "group_1"],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            order: ORDER_ASC
            missing_values_first: false
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_3", "group_1", "group_2"],
        expected_total_size=3)
    self._verify_handler(
        request='''
          col_params: {
            hparam: 'optional_string_hparam'
            order: ORDER_ASC
            missing_values_first: true
          }
          start_index: 0
          slice_size: 3
        ''',
        expected_session_group_names=["group_1", "group_2", "group_3"],
        expected_total_size=3)

  def _verify_full_response(self, request, expected_response):
    request_proto = api_pb2.ListSessionGroupsRequest()
    text_format.Merge(request, request_proto)
    handler = list_session_groups.Handler(
        backend_context.Context(self._mock_tb_context),
        request_proto)
    response = handler.run()
    self.assertProtoEquals(expected_response, response)

  def _verify_handler(
      self, request, expected_session_group_names, expected_total_size):
    request_proto = api_pb2.ListSessionGroupsRequest()
    text_format.Merge(request, request_proto)
    handler = list_session_groups.Handler(
        backend_context.Context(self._mock_tb_context),
        request_proto)
    response = handler.run()
    self.assertEqual(expected_session_group_names,
                     [sg.name for sg in response.session_groups])
    self.assertEqual(expected_total_size, response.total_size)

  def _serialized_plugin_data(self, data_oneof_field, text_protobuffer):
    oneof_type_dict = {
        DATA_TYPE_EXPERIMENT : api_pb2.Experiment,
        DATA_TYPE_SESSION_START_INFO : plugin_data_pb2.SessionStartInfo,
        DATA_TYPE_SESSION_END_INFO : plugin_data_pb2.SessionEndInfo
    }
    protobuffer = text_format.Merge(text_protobuffer,
                                    oneof_type_dict[data_oneof_field]())
    plugin_data = plugin_data_pb2.HParamsPluginData()
    getattr(plugin_data, data_oneof_field).CopyFrom(protobuffer)
    return metadata.create_summary_metadata(plugin_data).plugin_data.content


if __name__ == '__main__':
  tf.test.main()
