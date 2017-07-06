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

def op(name, tensor, collections=None, family=None):
  """Create a histogram summary op in a TensorFlow graph.


  Adding a histogram summary makes it possible to visualize your data's
  distribution in TensorBoard. You can see a detailed explanation of the
  TensorBoard histogram dashboard
  [here](https://www.tensorflow.org/get_started/tensorboard_histograms).

  The generated
  [`Summary`](https://www.tensorflow.org/code/tensorflow/core/framework/summary.proto)
  has one summary value containing a histogram for `values`.

  This op reports an `InvalidArgument` error if any value is not finite.
  Args:
    name: A name for the generated node. The TensorFlow naming system will
      modify this name to fit into the name scope in the graph. For example, if
      the name "loss" is passed, and is inside a scope called "tower_1", the
      name will be "tower_1/loss". This full name will be used as the tag,
      meaning it controls the display name in TensorBoard.
    values: A real numeric `Tensor` with any shape, that may not contain
      Infinities or NaNs. These values are used to create the histogram.
    collections: Optional list of graph collections keys. The new summary op is
      added to these collections. Defaults to `["summaries"]`.
    family: Optional; if provided, used as the prefix of the summary tag name.
      For example, if the name "loss" is passed in a name scope called
      "tower_1", the name would normally be "tower_1/loss". But perhaps you
      want to group every important metric together in their own tag group.
      If you passed the family "important", then the tag would be
      "important/tower_1/loss".

  Returns:
    A histogram summary op. When that op is run, it generates a scalar `Tensor`
    of type `string`, which contains a `Summary` protobuf.
  """
  return tb.plugins.histogram.op(name=name, tensor=tensor, collections=collections,
                              family=family)


__all__ = ["op"]
