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
"""Mesh summaries and TensorFlow operations to create them."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import tensorflow as tf

from tensorboard.plugins.mesh import metadata
from tensorboard.plugins.mesh import plugin_data_pb2

PLUGIN_NAME = 'mesh'


def _get_tensor_summary(
    name, display_name, description, tensor, content_type, json_config,
    collections):
  """Creates a tensor summary with summary metadata.

  Args:
    name: Uniquely identifiable name of the summary op. Could be replaced by
      combination of name and type to make it unique even outside of this
      summary.
    display_name: Will be used as the display name in TensorBoard.
      Defaults to `tag`.
    description: A longform readable description of the summary data. Markdown
      is supported.
    tensor: Tensor to display in summary.
    content_type: Type of content inside the Tensor.
    json_config: A string, JSON-serialized dictionary of ThreeJS classes
      configuration.
    collections: List of collections to add this summary to.

  Returns:
    Tensor summary with metadata.
  """
  tensor = tf.convert_to_tensor(value=tensor)
  tensor_metadata = metadata.create_summary_metadata(
      name,
      display_name,
      content_type,
      tensor.shape.as_list(),
      description,
      json_config=json_config)
  tensor_summary = tf.summary.tensor_summary(
      metadata.get_instance_name(name, content_type),
      tensor,
      summary_metadata=tensor_metadata,
      collections=collections)
  return tensor_summary


def _get_display_name(name, display_name):
  """Returns display_name from display_name and name."""
  if display_name is None:
    return name
  return display_name


def _get_json_config(config_dict):
  """Parses and returns JSON string from python dictionary."""
  json_config = '{}'
  if config_dict is not None:
    json_config = json.dumps(config_dict, sort_keys=True)
  return json_config


def op(name, vertices, faces=None, colors=None, display_name=None,
       description=None, collections=None, config_dict=None):
  """Creates a TensorFlow summary op for mesh rendering.

  Args:
    name: A name for this summary operation.
    vertices: Tensor of shape `[dim_1, ..., dim_n, 3]` representing the 3D
      coordinates of vertices.
    faces: Tensor of shape `[dim_1, ..., dim_n, 3]` containing indices of
      vertices within each triangle.
    colors: Tensor of shape `[dim_1, ..., dim_n, 3]` containing colors for each
      vertex.
    display_name: If set, will be used as the display name in TensorBoard.
      Defaults to `name`.
    description: A longform readable description of the summary data. Markdown
      is supported.
    collections: Which TensorFlow graph collections to add the summary op to.
      Defaults to `['summaries']`. Can usually be ignored.
    config_dict: Dictionary with ThreeJS classes names and configuration.

  Returns:
    Merged summary for mesh/point cloud representation.
  """
  display_name = _get_display_name(name, display_name)
  json_config = _get_json_config(config_dict)

  # All tensors representing a single mesh will be represented as separate
  # summaries internally. Those summaries will be regrouped on the client before
  # rendering.
  summaries = []
  tensors = [
      (vertices, plugin_data_pb2.MeshPluginData.VERTEX),
      (faces, plugin_data_pb2.MeshPluginData.FACE),
      (colors, plugin_data_pb2.MeshPluginData.COLOR)
  ]

  for tensor, content_type in tensors:
    if tensor is None:
      continue
    summaries.append(
        _get_tensor_summary(name, display_name, description, tensor,
                            content_type, json_config, collections))

  all_summaries = tf.summary.merge(
      summaries, collections=collections, name=name)
  return all_summaries


def pb(name,
       vertices,
       faces=None,
       colors=None,
       display_name=None,
       description=None,
       config_dict=None):
  """Create a mesh summary to save in pb format.

  Args:
    name: A name for this summary operation.
    vertices: numpy array of shape `[dim_1, ..., dim_n, 3]` representing the 3D
      coordinates of vertices.
    faces: numpy array of shape `[dim_1, ..., dim_n, 3]` containing indices of
      vertices within each triangle.
    colors: numpy array of shape `[dim_1, ..., dim_n, 3]` containing colors for
      each vertex.
    display_name: If set, will be used as the display name in TensorBoard.
      Defaults to `name`.
    description: A longform readable description of the summary data. Markdown
      is supported.
    config_dict: Dictionary with ThreeJS classes names and configuration.

  Returns:
    Instance of tf.Summary class.
  """
  display_name = _get_display_name(name, display_name)
  json_config = _get_json_config(config_dict)

  summaries = []
  tensors = [(vertices, plugin_data_pb2.MeshPluginData.VERTEX, tf.float32),
             (faces, plugin_data_pb2.MeshPluginData.FACE, tf.int32),
             (colors, plugin_data_pb2.MeshPluginData.COLOR, tf.uint8)]
  for tensor, content_type, data_type in tensors:
    if tensor is None:
      continue
    tensor_shape = tensor.shape
    tensor = tf.compat.v1.make_tensor_proto(tensor, dtype=data_type)
    summary_metadata = metadata.create_summary_metadata(
        name,
        display_name,
        content_type,
        tensor_shape,
        description,
        json_config=json_config)
    tag = metadata.get_instance_name(name, content_type)
    summaries.append((tag, summary_metadata, tensor))

  summary = tf.Summary()
  for tag, summary_metadata, tensor in summaries:
    tf_summary_metadata = tf.SummaryMetadata.FromString(
        summary_metadata.SerializeToString())
    summary.value.add(tag=tag, metadata=tf_summary_metadata, tensor=tensor)
  return summary
