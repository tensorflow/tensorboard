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

# TODO(cais): Use tf_debug instead.
from tensorflow.python.debug.lib import debug_data


def extract_gated_grpc_tensors(graph_def):
  gated = []
  for node in graph_def.node:
    if node.op == "DebugIdentity":
      for attr_key in node.attr:
        if attr_key == "gated_grpc" and node.attr[attr_key].b:
          node_name, output_slot, _, debug_op = (
              debug_data.parse_debug_node_name(node.name))
          gated.append((node_name, output_slot, debug_op))

  return gated
