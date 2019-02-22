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

def _is_present(key_to_proto, proto, get_key, error_msg):
  """Checks for key in a dict and raises if content in the dict differ from proto.

  Args:
    key_to_proto: A dict that maps key to a proto.
    proto: A proto.
    get_key: A lambda that returns a string key from a proto.
    error_msg: Error message.

  Raises:
    ValueError when there is the key in the dict but contents mismatch.

  Returns:
    True if key from proto is present in the key_to_proto.
  """
  key = get_key(proto)
  if key in key_to_proto and proto != key_to_proto.get(key):
    raise ValueError(error_msg + ': %s' % key)
  return key in key_to_proto


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

  node_name_to_nodedef = {}
  for node in to_proto.node:
    node_name_to_nodedef[node.name] = node

  func_name_to_func = {}
  for func in to_proto.library.function:
    func_name_to_func[func.signature.name] = func

  gradient_name_to_def = {}
  for gradient_def in to_proto.library.gradient:
    gradient_name_to_def[gradient_def.gradient_func] = gradient_def

  for from_node in from_proto.node:
    if not _is_present(
        node_name_to_nodedef,
        from_node,
        lambda n: n.name,
        'Cannot combine GraphDefs because nodes share a name but are different'):
      to_proto.node.add().CopyFrom(from_node)

  for from_function in from_proto.library.function:
    if not _is_present(
        func_name_to_func,
        from_function,
        lambda f: f.signature.name,
        'Cannot combine GraphDefs because functions share a name but are different'):
      to_proto.library.function.add().CopyFrom(from_function)

  for from_gradient in from_proto.library.gradient:
    if not _is_present(
        gradient_name_to_def,
        from_gradient,
        lambda g: g.gradient_func,
        ('Cannot combine GraphDefs because gradients share a gradient_func name '
        'but maps to a different function')):
      to_proto.library.gradient.add().CopyFrom(from_gradient)

  return to_proto
