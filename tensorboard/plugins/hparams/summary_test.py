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
"""Tests for summary."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
from google.protobuf import struct_pb2

from tensorboard.plugins.hparams import summary
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import plugin_data_pb2

class SummaryTest(tf.test.TestCase):
  def test_experiment_pb(self):
    hparam_infos = [
        api_pb2.HParamInfo(name="param1",
                           display_name="display_name1",
                           description="foo",
                           type=api_pb2.DATA_TYPE_STRING,
                           domain_discrete=struct_pb2.ListValue(
                               values=[struct_pb2.Value(string_value='a'),
                                       struct_pb2.Value(string_value='b')])),
        api_pb2.HParamInfo(name="param2",
                           display_name="display_name2",
                           description="bar",
                           type=api_pb2.DATA_TYPE_FLOAT64,
                           domain_interval=api_pb2.Interval(min_value=-100.0,
                                                            max_value=100.0))
    ]
    metric_infos = [
        api_pb2.MetricInfo(name=api_pb2.MetricName(tag="loss"),
                           dataset_type=api_pb2.DATASET_VALIDATION),
        api_pb2.MetricInfo(name=api_pb2.MetricName(group="train/", tag="acc"),
                           dataset_type=api_pb2.DATASET_TRAINING),
    ]
    time_created_secs = 314159.0
    self.assertEqual(
        summary.experiment_pb(hparam_infos,
                              metric_infos,
                              time_created_secs=time_created_secs),
        tf.Summary(
            value=[
                tf.Summary.Value(
                    tag="_hparams_/experiment",
                    metadata=tf.SummaryMetadata(
                        plugin_data=tf.SummaryMetadata.PluginData(
                            plugin_name="hparams",
                            content=(
                                plugin_data_pb2.HParamsPluginData(
                                    version=0,
                                    experiment=api_pb2.Experiment(
                                        time_created_secs=time_created_secs,
                                        hparam_infos=hparam_infos,
                                        metric_infos=metric_infos))
                                .SerializeToString()))))
            ]))

  def test_session_start_pb(self):
    start_time_secs = 314160
    session_start_info = plugin_data_pb2.SessionStartInfo(
        model_uri="//model/uri",
        group_name="session_group",
        start_time_secs=start_time_secs)
    session_start_info.hparams["param1"].string_value = "string"
    # TODO: Fix nondeterminism.
    # session_start_info.hparams["param2"].number_value = 5.0
    # session_start_info.hparams["param3"].bool_value = False
    self.assertEqual(
        summary.session_start_pb(
            hparams={
                "param1":"string",
                # "param2":5,
                # "param3":False,
            },
            model_uri="//model/uri",
            group_name="session_group",
            start_time_secs=start_time_secs),
        tf.Summary(
            value=[
                tf.Summary.Value(
                    tag="_hparams_/session_start_info",
                    metadata=tf.SummaryMetadata(
                        plugin_data=tf.SummaryMetadata.PluginData(
                            plugin_name="hparams",
                            content=(plugin_data_pb2.HParamsPluginData(
                                version=0,
                                session_start_info=session_start_info
                            ).SerializeToString()))))
            ]))

  def test_session_end_pb(self):
    end_time_secs = 1234.0
    self.assertEqual(
        summary.session_end_pb(api_pb2.STATUS_SUCCESS, end_time_secs),
        tf.Summary(
            value=[
                tf.Summary.Value(
                    tag="_hparams_/session_end_info",
                    metadata=tf.SummaryMetadata(
                        plugin_data=tf.SummaryMetadata.PluginData(
                            plugin_name="hparams",
                            content=(plugin_data_pb2.HParamsPluginData(
                                version=0,
                                session_end_info=(
                                    plugin_data_pb2.SessionEndInfo(
                                        status=api_pb2.STATUS_SUCCESS,
                                        end_time_secs=end_time_secs,
                                    ))
                            ).SerializeToString()))))
            ]))

if __name__ == '__main__':
  tf.test.main()
