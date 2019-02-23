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
"""Utilities for graph plugin."""
from tensorboard.compat.proto import function_pb2


def _safe_copy_proto_list_values(dst_proto_list, src_proto_list, get_key, error_msg):
  """Safely copies the value from src_proto_list to dst_proto_list.

  Copies if dst_proto_list does not contain an item with the same key. In case an item
  is found with the same key, it checks whether contents match and, if not, it raises
  a ValueError.

  Args:
    dst_proto_list: A `RepeatedCompositeContainer` or
      `RepeatedScalarContainer` into which values should be copied.
    src_proto_list: A container holding the same kind of values as in
      `dst_proto_list` from which values should be copied.
    get_key: A function that takes an element of `dst_proto_list` or
      `src_proto_list` and returns a key, such that if two elements have
      the same key then it is required that they be deep-equal. For
      instance, if `dst_proto_list` is a list of nodes, then `get_key`
      might be `lambda node: node.name` to indicate that if two nodes
      have the same name then they must be the same node. All keys must
      be hashable.
    error_msg: A user-friendly error message to be raised in the case
      that two nodes share a key but are distinct.

  Raises:
    ValueError when there is the key in the dict but contents mismatch.
  """
  key_to_proto = {}
  for proto in dst_proto_list:
    key = get_key(proto)
    key_to_proto[key] = proto

  for proto in src_proto_list:
    key = get_key(proto)
    if key in key_to_proto:
      if proto != key_to_proto.get(key):
        raise ValueError('%s: %s' % (error_msg, key))
    else:
      dst_proto_list.add().CopyFrom(proto)


def combine_graph_defs(to_proto, from_proto):
  """Combines two GraphDefs by adding nodes from from_proto into to_proto.

  All GraphDefs are expected to be of TensorBoard's.
  It assumes node names are unique across GraphDefs if contents differ. The
  names can be the same if the NodeDef content are exactly the same.

  Args:
    to_proto: A destination TensorBoard GraphDef.
    from_proto: A TensorBoard GraphDef to copy contents from.

  Returns:
    to_proto
  """
  if from_proto.version != to_proto.version:
    raise ValueError('Cannot combine GraphDefs of different versions.')

  _safe_copy_proto_list_values(
      to_proto.node,
      from_proto.node,
      lambda n: n.name,
      'Cannot combine GraphDefs because nodes share a name but are different')

  _safe_copy_proto_list_values(
      to_proto.library.function,
      from_proto.library.function,
      lambda n: n.signature.name,
      ('Cannot combine GraphDefs because functions share a name but '
       'are different'))

  _safe_copy_proto_list_values(
      to_proto.library.gradient,
      from_proto.library.gradient,
      lambda g: g.gradient_func,
      ('Cannot combine GraphDefs because gradients share a gradient_func name '
       'but maps to a different function'))

  return to_proto
