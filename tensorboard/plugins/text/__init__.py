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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

def op(name, tensor, collections=None):
  """Create a text summary op in a TensorFlow graph.

  Text data summarized via this op will be visible in the Text Dashboard
  in TensorBoard. The text dashboard supports markdown, and automatically
  organizes 1d and 2d tensors into tables.

  If a tensor with more than 2 dimensions is provided, a 2d subarray will be
  displayed along with a warning message.

  Args:
    name: A name for the generated node. The TensorFlow naming system will
      modify this name to fit into the name scope in the graph. For example, if
      the name "loss" is passed, and is inside a scope called "tower_1", the
      name will be "tower_1/loss". This full name will be used as the tag,
      meaning it controls the display name in TensorBoard.
    tensor: A string type Tensor to summarize.
    collections: Optional list of graph collections keys. The new summary op is
      added to these collections. Defaults to `["summaries"]`.

  Returns:
    A scalar_summary op. When that op is run, it generates a scalar `Tensor` of
    type `string`, which contains a `Summary` protobuf.

  Raises:
    ValueError: If tensor has the wrong shape or type.
  """
  return tf.summary.text(name=name, tensor=tensor, collections=collections)


__all__ = ["op"]
