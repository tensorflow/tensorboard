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


def _safe_copy_proto_list_values(to_proto_list, from_proto_list, get_key, error_msg):
  """Safely copies the value from from_proto_list to to_proto_list.

  Copies if to_proto_list does not contain an item with the same key. In case an item
  is found with the same key, it checks whether contents match and, if not, it raises
  a ValueError.

  Args:
    to_proto_list: A dict that maps key to a proto.
    proto: A proto.
    get_key: A lambda that returns a string key from a proto.
    error_msg: User friendly error message.

  Raises:
    ValueError when there is the key in the dict but contents mismatch.

  Returns:
    True if key from proto is present in the key_to_proto.
  """
  key_to_proto = {}
  for proto in to_proto_list:
    key = get_key(proto)
    key_to_proto[key] = proto

  for proto in from_proto_list:
    key = get_key(proto)
    if key in key_to_proto:
      if proto != key_to_proto.get(key):
        raise ValueError(error_msg + ': %s' % key)
    else:
      to_proto_list.add().CopyFrom(proto)


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
      'Cannot combine GraphDefs because nodes share a name but are different')

  _safe_copy_proto_list_values(
      to_proto.library.gradient,
      from_proto.library.gradient,
      lambda g: g.gradient_func,
      ('Cannot combine GraphDefs because gradients share a gradient_func name '
      'but maps to a different function'))

  return to_proto
