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

def op(name, tensor, max_outputs=3, collections=None, family=None):
  """Create a scalar summary op in a TensorFlow graph.

  The summary has up to `max_outputs` summary values containing images. The
  images are built from `tensor` which must be 4-D with shape `[batch_size,
  height, width, channels]` and where `channels` can be:

  *  1: `tensor` is interpreted as Grayscale.
  *  3: `tensor` is interpreted as RGB.
  *  4: `tensor` is interpreted as RGBA.

  The images have the same number of channels as the input tensor. For float
  input, the values are normalized one image at a time to fit in the range
  `[0, 255]`.  `uint8` values are unchanged.  The op uses two different
  normalization algorithms:

  *  If the input values are all positive, they are rescaled so the largest one
     is 255.

  *  If any input value is negative, the values are shifted so input value 0.0
     is at 127.  They are then rescaled so that either the smallest value is 0,
     or the largest one is 255.

  The `tag` in the outputted Summary.Value protobufs is generated based on the
  name, with a suffix depending on the max_outputs setting:

  *  If `max_outputs` is 1, the summary value tag is '*name*/image'.
  *  If `max_outputs` is greater than 1, the summary value tags are
     generated sequentially as '*name*/image/0', '*name*/image/1', etc.

  Args:
    name: A name for the generated node. The TensorFlow naming system will
      modify this name to fit into the name scope in the graph. For example, if
      the name "loss" is passed, and is inside a scope called "tower_1", the
      name will be "tower_1/loss". This full name will be used as the tag,
      meaning it controls the display name in TensorBoard.
    tensor: A 4-D `uint8` or `float32` `Tensor` of shape `[batch_size, height,
      width, channels]` where `channels` is 1, 3, or 4.
    max_outputs: Max number of batch elements to generate images for.
    collections: Optional list of graph collections keys. The new summary op is
      added to these collections. Defaults to `["summaries"]`.
    family: Optional; if provided, used as the prefix of the summary tag name.
      For example, if the name "loss" is passed in a name scope called
      "tower_1", the name would normally be "tower_1/loss". But perhaps you
      want to group every important metric together in their own tag group.
      If you passed the family "important", then the tag would be
      "important/tower_1/loss".

  Returns:
    An image summary op. When that op is run, it generates a scalar `Tensor` of
    type `string`, which contains a `Summary` protobuf.

  """
  return tf.summary.image(
      name=name,
      tensor=tensor,
      max_outputs=max_outputs,
      collections=collections,
      family=family
  )



__all__ = ["op"]
