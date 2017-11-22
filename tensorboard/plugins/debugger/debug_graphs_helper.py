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
"""Helper methods and classes for tfdbg-decorated graphs."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorflow.python.debug.lib import debug_graphs


def extract_gated_grpc_tensors(graph_def, match_debug_op=None):
  """Extract all nodes with gated-gRPC debug ops attached.

  Args:
    graph_def: A tf.GraphDef proto.
    match_debug_op: Return tensors and nodes with only matching the specified
      debug op name (optional). If `None`, will extract only `DebugIdentity`
      debug ops.

  Returns:
    A list of (node_name, op_type, output_slot, debug_op) tuples.
  """
  if match_debug_op is None:
    match_debug_op = 'DebugIdentity'

  node_name_to_op_type = {}

  # First, construct a map from node name to op type.
  for node in graph_def.node:
    node_name_to_op_type[node.name] = node.op

  # Second, populate the output list.
  gated = []
  for node in graph_def.node:
    if node.op != match_debug_op:
      continue

    for attr_key in node.attr:
      if attr_key == 'gated_grpc' and node.attr[attr_key].b:

        node_name, output_slot, _, debug_op = (
            debug_graphs.parse_debug_node_name(node.name))
        gated.append(
            (node_name, node_name_to_op_type[node_name], output_slot, debug_op))
  return gated


def maybe_base_expanded_node_name(node_name, graph_def):
  """Expand the base name if there are node names nested under the node.

  For example, if there are two nodes in the graph, "a" and "a/read", then
  calling this function on "a" will give "a/(a)", a form that points at
  a leaf node in the nested TensorBoard graph. Calling this function on
  "a/read" will just return "a/read", because there is no node nested under
  it.

  Args:
    node_name: Name of the node.
    graph_def: The `GraphDef` that the node is a part of.

  Return:
    Possibly base-expanded node name.
  """
  for node in graph_def.node:
    if node.name.startswith(node_name + '/'):
      return node_name + '/(' + node_name.split('/')[-1] + ')'
  return node_name
