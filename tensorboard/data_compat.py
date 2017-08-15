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
"""Utilities to migrate legacy protos to their modern equivalents."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from tensorboard.plugins.audio import metadata as audio_metadata
from tensorboard.plugins.image import metadata as image_metadata
from tensorboard.plugins.histogram import metadata as histogram_metadata
from tensorboard.plugins.scalar import metadata as scalar_metadata


def migrate_value(value):
  """Convert `value` to a new-style value, if necessary and possible.

  An "old-style" value is a value that uses any `value` field other than
  the `tensor` field. A "new-style" value is a value that uses the
  `tensor` field. TensorBoard continues to support old-style values on
  disk; this method converts them to new-style values so that further
  code need only deal with one data format.

  Arguments:
    value: A `tf.Summary.Value` object. This argument is not modified.

  Returns:
    If the `value` is an old-style value for which there is a new-style
    equivalent, the result is the new-style value. Otherwise---if the
    value is already new-style or does not yet have a new-style
    equivalent---the value will be returned unchanged.

  :type value: tf.Summary.Value
  :rtype: tf.Summary.Value
  """
  handler = {
      'histo': _migrate_histogram_value,
      'image': _migrate_image_value,
      'audio': _migrate_audio_value,
      'simple_value': _migrate_scalar_value,
  }.get(value.WhichOneof('value'))
  return handler(value) if handler else value


def _migrate_histogram_value(value):
  histogram_value = value.histo
  bucket_lefts = [histogram_value.min] + histogram_value.bucket_limit[:-1]
  bucket_rights = histogram_value.bucket_limit[:-1] + [histogram_value.max]
  bucket_counts = histogram_value.bucket
  buckets = np.array([bucket_lefts, bucket_rights, bucket_counts]).transpose()

  tensor_proto = tf.make_tensor_proto(buckets)
  summary_metadata = histogram_metadata.create_summary_metadata(
      display_name=value.metadata.display_name or value.tag,
      description=value.metadata.summary_description)
  return tf.Summary.Value(tag=value.tag,
                          metadata=summary_metadata,
                          tensor=tensor_proto)


def _migrate_image_value(value):
  image_value = value.image
  data = [tf.compat.as_bytes(str(image_value.width)),
          tf.compat.as_bytes(str(image_value.height)),
          tf.compat.as_bytes(image_value.encoded_image_string)]

  tensor_proto = tf.make_tensor_proto(data)
  summary_metadata = image_metadata.create_summary_metadata(
      display_name=value.metadata.display_name or value.tag,
      description=value.metadata.summary_description)
  return tf.Summary.Value(tag=value.tag,
                          metadata=summary_metadata,
                          tensor=tensor_proto)


def _migrate_audio_value(value):
  audio_value = value.audio
  data = [[audio_value.encoded_audio_string, b'']]  # empty label
  tensor_proto = tf.make_tensor_proto(data)
  summary_metadata = audio_metadata.create_summary_metadata(
      display_name=value.metadata.display_name or value.tag,
      description=value.metadata.summary_description,
      encoding=audio_metadata.Encoding.Value('WAV'))
  return tf.Summary.Value(tag=value.tag,
                          metadata=summary_metadata,
                          tensor=tensor_proto)


def _migrate_scalar_value(value):
  scalar_value = value.simple_value
  tensor_proto = tf.make_tensor_proto(scalar_value)
  summary_metadata = scalar_metadata.create_summary_metadata(
      display_name=value.metadata.display_name or value.tag,
      description=value.metadata.summary_description)
  return tf.Summary.Value(tag=value.tag,
                          metadata=summary_metadata,
                          tensor=tensor_proto)
