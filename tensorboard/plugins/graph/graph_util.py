# -*- coding: utf-8 -*-
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

def combine_graph_defs(to_proto, from_proto):
  """Combines two GraphDefs by adding nodes from from_proto into to_proto.

  Args:
    to_proto: a destination GraphDef.
    from_proto: a GraphDef to copy contents from.

  Returns:
    to_proto
  """
  if from_proto.version != to_proto.version:
    raise ValueError('Cannot combine GraphDefs of different versions.')

  for from_node in from_proto.node:
    to_node = to_proto.node.add()
    to_node.CopyFrom(from_node)

  if from_proto.library:
    if not to_proto.library:
      to_proto.library = function_pb2.FunctionDefLibrary()

    for from_function in from_proto.library.function:
      to_function = to_proto.library.function.add()
      to_function.CopyFrom(from_function)
    for from_gradient in from_proto.library.gradient:
      to_gradient = to_proto.library.gradient.add()
      to_gradient.CopyFrom(from_gradient)

  return to_proto
