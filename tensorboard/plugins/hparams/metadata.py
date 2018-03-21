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
"""Constants used in the HParams plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard.plugins.hparams import plugin_data_pb2

EXPERIMENT_TAG = '_hparams_/experiment'
SESSION_START_INFO_TAG = '_hparams_/session_start_info'
SESSION_END_INFO_TAG = '_hparams_/session_end_info'
PLUGIN_NAME = 'hparams'
PLUGIN_DATA_VERSION = 0

def create_summary_metadata(hparams_plugin_data):
  """Creates a tf.SummaryMetadata holding a copy of the given
  HParamsPluginData message in its plugin_data.content field.
  Sets the version field of hparams_plugin_data copy to PLUGIN_DATA_VERSION.
  """
  if not isinstance(hparams_plugin_data, plugin_data_pb2.HParamsPluginData):
    raise TypeError('Needed an instance of plugin_data_pb2.HParamsPluginData.'
                    ' Got: %s' % type(hparams_plugin_data))
  content = plugin_data_pb2.HParamsPluginData()
  content.CopyFrom(hparams_plugin_data)
  content.version = PLUGIN_DATA_VERSION
  return tf.SummaryMetadata(
      plugin_data=tf.SummaryMetadata.PluginData(
          plugin_name=PLUGIN_NAME,
          content=content.SerializeToString()))
