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
"""Text summaries and TensorFlow operations to create them.
A text summary stores a single string value.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
import numpy as np

from tensorboard.plugins.text import metadata


def op(name,
       data,
       display_name=None,
       description=None,
       collections=None):
  """Create a string summary op.
  Arguments:
    name: A unique name for the generated summary node.
    data: A rank-0 `Tensor`. Must have `dtype` of string.
    display_name: Optional name for this summary in TensorBoard, as a
      constant `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
      constant `str`. Markdown is supported. Defaults to empty.
    collections: Optional list of graph collections keys. The new
      summary op is added to these collections. Defaults to
      `[Graph Keys.SUMMARIES]`.
  Returns:
    A TensorFlow summary op.
  """
  if display_name is None:
    display_name = name
  summary_metadata = metadata.create_summary_metadata(
      display_name=display_name, description=description)
  with tf.name_scope(name):
    with tf.control_dependencies([tf.assert_type(data, tf.string)]):
      return tf.summary.tensor_summary(name='text_summary',
                                       tensor=data,
                                       collections=collections,
                                       summary_metadata=summary_metadata)


def pb(name, data, display_name=None, description=None):
  """Create a scalar summary protobuf.
  Arguments:
    name: A unique name for the generated summary, including any desired
      name scopes.
    data: A python string. Or a rank-0 numpy array containing string data (of
      type numpy.string_). 
    display_name: Optional name for this summary in TensorBoard, as a
      `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
      `str`. Markdown is supported. Defaults to empty.
  Returns:
    A `tf.Summary` protobuf object.
  """
  if isinstance(data, str):
    data = np.array(data)
  if data.shape != ():
    raise ValueError('Expected rank of 0 for data, saw shape: %s.' % data.shape)
  if data.dtype.kind != 'S':
    raise ValueError(
        'Type %s is not supported. Only strings are.' % data.dtype.name)
  tensor = tf.make_tensor_proto(data, dtype=tf.string)

  if display_name is None:
    display_name = name
  summary_metadata = metadata.create_summary_metadata(
      display_name=display_name, description=description)
  summary = tf.Summary()
  summary.value.add(tag='%s/text_summary' % name,
                    metadata=summary_metadata,
                    tensor=tensor)
  return summary
