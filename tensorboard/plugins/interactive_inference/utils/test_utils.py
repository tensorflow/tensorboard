# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""Helper functions for writing inference plugin tests."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf


def make_fake_example(single_int_val=0):
  """Make a fake example with numeric and string features."""
  example = tf.train.Example()
  example.features.feature['repeated_float'].float_list.value.extend(
      [1.0, 2.0, 3.0, 4.0])
  example.features.feature['repeated_int'].int64_list.value.extend([10, 20])

  example.features.feature['single_int'].int64_list.value.extend(
      [single_int_val])
  example.features.feature['single_float'].float_list.value.extend([24.5])
  example.features.feature['non_numeric'].bytes_list.value.extend(
      [b'cat', b'cat', b'woof'])
  return example


def write_out_examples(examples, path):
  """Writes protos to the CNS path."""

  writer = tf.python_io.TFRecordWriter(path)
  for example in examples:
    writer.write(example.SerializeToString())


def value_from_example(example, feature_name):
  """Returns the feature as a Python list."""
  feature = example.features.feature[feature_name]
  feature_type = feature.WhichOneof('kind')
  return getattr(feature, feature_type).value[:]
