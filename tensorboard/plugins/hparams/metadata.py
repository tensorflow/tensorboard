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
from tensorboard.plugins.hparams import error

PLUGIN_NAME = 'hparams'
PLUGIN_DATA_VERSION = 0

EXPERIMENT_TAG = '_hparams_/experiment'
SESSION_START_INFO_TAG = '_hparams_/session_start_info'
SESSION_END_INFO_TAG = '_hparams_/session_end_info'

# HParamsPluginData.data oneof field names.
DATA_TYPE_EXPERIMENT='experiment'
DATA_TYPE_SESSION_START_INFO='session_start_info'
DATA_TYPE_SESSION_END_INFO='session_end_info'

# TODO(erez): Make 'data_oneof_field' more strongly typed than a string
# e.g. a protobuf descriptor or similar.
def create_summary_metadata(data_oneof_field, protobuffer):
  """Creates a summary holding an HParamsPluginData message containing
  'protobuffer'.

  Arguments:
    data_oneof_field. String. The oneof field name in HParamsPluginData to
    populate with 'protobuffer'.
  """
  content=plugin_data_pb2.HParamsPluginData(version=PLUGIN_DATA_VERSION)
  getattr(content, data_oneof_field).CopyFrom(protobuffer)
  return tf.SummaryMetadata(
      plugin_data=tf.SummaryMetadata.PluginData(
          plugin_name=PLUGIN_NAME,
          content=content.SerializeToString()))


def parse_plugin_data_as(content, data_oneof_field):
  """Parses a given HParam's SummaryMetadata.plugin_data.content and
  returns the data oneof's field given by 'data_oneof_field'.

  Note: asserts that the oneof field has 'data_oneof_field' set.
  """
  plugin_data = plugin_data_pb2.HParamsPluginData.FromString(content)
  if plugin_data.version != PLUGIN_DATA_VERSION:
    raise error.HParamsError(
        'Only supports plugin_data version: %s; found: %s in: %s' %
        (PLUGIN_DATA_VERSION, plugin_data.version, plugin_data))
  assert plugin_data.HasField(
      data_oneof_field), ('Expected plugin_data.%s to be set. Got: %s',
                          plugin_data)
  return getattr(plugin_data, data_oneof_field)
