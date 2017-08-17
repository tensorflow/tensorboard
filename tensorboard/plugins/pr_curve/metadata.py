# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Internal information about the pr_curves plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from google.protobuf import json_format
import tensorflow as tf
from tensorboard.plugins.pr_curve import pr_curve_pb2


PLUGIN_NAME = 'pr_curves'

# Indices for obtaining precision and recall values from the tensor stored in a
# summary.
PRECISION_INDEX = 4
RECALL_INDEX = 5

def create_summary_metadata(display_name, description, num_thresholds):
  """Create a `tf.SummaryMetadata` proto for pr_curves plugin data.

  Arguments:
    display_name: The display name used in TensorBoard.
    description: The description to show in TensorBoard.
    num_thresholds: The number of thresholds to use for PR curves.

  Returns:
    A `tf.SummaryMetadata` protobuf object.
  """
  pr_curve_plugin_data = pr_curve_pb2.PrCurvePluginData(
        num_thresholds=num_thresholds)
  content = json_format.MessageToJson(pr_curve_plugin_data)
  return tf.SummaryMetadata(
      display_name=display_name,
      summary_description=description,
      plugin_data=tf.SummaryMetadata.PluginData(plugin_name=PLUGIN_NAME,
                                                content=content))
