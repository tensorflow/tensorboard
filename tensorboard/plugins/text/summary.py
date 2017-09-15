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
import six

from tensorboard.plugins.text import metadata


def op(name,
       data,
       display_name=None,
       description=None,
       collections=None):
  """Summarizes textual data.

  Text data summarized via this plugin will be visible in the Text Dashboard
  in TensorBoard. The standard TensorBoard Text Dashboard will render markdown
  in the strings, and will automatically organize 1d and 2d tensors into tables.
  If a tensor with more than 2 dimensions is provided, a 2d subarray will be
  displayed along with a warning message. (Note that this behavior is not
  intrinsic to the text summary api, but rather to the default TensorBoard text
  plugin.)

  Args:
    name: A name for the generated node. Will also serve as a series name in
      TensorBoard.
    data: a string-type Tensor to summarize. The text should be UTF-encoded.
    display_name: Optional name for this summary in TensorBoard, as a
      constant `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
      constant `str`. Markdown is supported. Defaults to empty.
    collections: Optional list of ops.GraphKeys.  The collections to add the
      summary to.  Defaults to [_ops.GraphKeys.SUMMARIES]

  Returns:
    A TensorSummary op that is configured so that TensorBoard will recognize
    that it contains textual data. The TensorSummary is a scalar `Tensor` of
    type `string` which contains `Summary` protobufs.

  Raises:
    ValueError: If tensor has the wrong type.
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
  """Create a text summary protobuf.

  Arguments:
    name: A name for the generated node. Will also serve as a series name in
      TensorBoard.
    data: A python bytes string (str), a unicode string, or a numpy array
      containing string data (of type numpy.string_).
    display_name: Optional name for this summary in TensorBoard, as a
      `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
      `str`. Markdown is supported. Defaults to empty.

  Raises:
    ValueError: If the data is of the wrong type.

  Returns:
    A `tf.Summary` protobuf object.
  """
  if isinstance(data, (six.binary_type, six.string_types)):
    if isinstance(data, six.text_type):
      # This is a unicode string.
      data = tf.compat.as_bytes(data)
    data = np.array(data)
  if data.dtype.kind != 'S':
    raise ValueError(
        'Type %r is not supported. Only strings are.' % data.dtype.name)
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
