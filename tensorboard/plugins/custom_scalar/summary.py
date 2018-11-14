
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
"""Contains summaries related to laying out the custom scalars dashboard.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard.plugins.custom_scalar import layout_pb2
from tensorboard.plugins.custom_scalar import metadata

def op(scalars_layout, collections=None):
  """Creates a summary that contains a layout.

  When users navigate to the custom scalars dashboard, they will see a layout
  based on the proto provided to this function.

  Args:
    scalars_layout: The scalars_layout_pb2.Layout proto that specifies the
        layout.
    collections: Optional list of graph collections keys. The new
        summary op is added to these collections. Defaults to
        `[Graph Keys.SUMMARIES]`.

  Returns:
    A tensor summary op that writes the layout to disk.
  """
  assert isinstance(scalars_layout, layout_pb2.Layout)
  return tf.summary.tensor_summary(name=metadata.CONFIG_SUMMARY_TAG,
                                   tensor=tf.constant(
                                       scalars_layout.SerializeToString(),
                                       dtype=tf.string),
                                   collections=collections,
                                   summary_metadata=_create_summary_metadata())

def pb(scalars_layout):
  """Creates a summary that contains a layout.

  When users navigate to the custom scalars dashboard, they will see a layout
  based on the proto provided to this function.

  Args:
    scalars_layout: The scalars_layout_pb2.Layout proto that specifies the
        layout.

  Returns:
    A summary proto containing the layout.
  """
  assert isinstance(scalars_layout, layout_pb2.Layout)
  tensor = tf.make_tensor_proto(
      scalars_layout.SerializeToString(), dtype=tf.string)
  summary = tf.Summary()
  summary.value.add(tag=metadata.CONFIG_SUMMARY_TAG,
                    metadata=_create_summary_metadata(),
                    tensor=tensor)
  return summary

def _create_summary_metadata():
  return tf.SummaryMetadata(
      plugin_data=tf.SummaryMetadata.PluginData(
          plugin_name=metadata.PLUGIN_NAME))
