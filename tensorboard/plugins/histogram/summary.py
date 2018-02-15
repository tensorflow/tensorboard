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
"""Histogram summaries and TensorFlow operations to create them.

A histogram summary stores a list of buckets. Each bucket is encoded as
a triple `[left_edge, right_edge, count]`. Thus, a full histogram is
encoded as a tensor of dimension `[k, 3]`.

In general, the value of `k` (the number of buckets) will be a constant,
like 30. There are two edge cases: if there is no data, then there are
no buckets (the shape is `[0, 3]`); and if there is data but all points
have the same value, then there is one bucket whose left and right
endpoints are the same (the shape is `[1, 3]`).

NOTE: This module is in beta, and its API is subject to change, but the
data that it stores to disk will be supported forever.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
import numpy as np

from tensorboard.plugins.histogram import metadata

DEFAULT_BUCKET_COUNT = 30


def _buckets(data, bucket_count=None):
  """Create a TensorFlow op to group data into histogram buckets.

  Arguments:
    data: A `Tensor` of any shape. Must be castable to `float64`.
    bucket_count: Optional positive `int` or scalar `int32` `Tensor`.
  Returns:
    A `Tensor` of shape `[k, 3]` and type `float64`. The `i`th row is
    a triple `[left_edge, right_edge, count]` for a single bucket.
    The value of `k` is either `bucket_count` or `1` or `0`.
  """
  if bucket_count is None:
    bucket_count = DEFAULT_BUCKET_COUNT
  with tf.name_scope('buckets', values=[data, bucket_count]), \
       tf.control_dependencies([tf.assert_scalar(bucket_count),
                                tf.assert_type(bucket_count, tf.int32)]):
    data = tf.reshape(data, shape=[-1])  # flatten
    data = tf.cast(data, tf.float64)
    is_empty = tf.equal(tf.size(data), 0)

    def when_empty():
      return tf.constant([], shape=(0, 3), dtype=tf.float64)

    def when_nonempty():
      min_ = tf.reduce_min(data)
      max_ = tf.reduce_max(data)
      range_ = max_ - min_
      is_singular = tf.equal(range_, 0)

      def when_nonsingular():
        bucket_width = range_ / tf.cast(bucket_count, tf.float64)
        offsets = data - min_
        bucket_indices = tf.cast(
            tf.floor(offsets / bucket_width), dtype=tf.int32)
        clamped_indices = tf.minimum(bucket_indices, bucket_count - 1)
        one_hots = tf.one_hot(clamped_indices, depth=bucket_count)
        bucket_counts = tf.cast(
            tf.reduce_sum(one_hots, axis=0), dtype=tf.float64)
        edges = tf.lin_space(min_, max_, bucket_count + 1)
        left_edges = edges[:-1]
        right_edges = edges[1:]
        return tf.transpose(tf.stack([left_edges, right_edges, bucket_counts]))

      def when_singular():
        center = min_
        bucket_starts = tf.stack([center - 0.5])
        bucket_ends = tf.stack([center + 0.5])
        bucket_counts = tf.stack([tf.cast(tf.size(data), tf.float64)])
        return tf.transpose(
            tf.stack([bucket_starts, bucket_ends, bucket_counts]))

      return tf.cond(is_singular, when_singular, when_nonsingular)

    return tf.cond(is_empty, when_empty, when_nonempty)


def op(name,
       data,
       edges=None,
       bucket_count=None,
       display_name=None,
       description=None,
       collections=None):
  """Create a histogram summary op.

  Arguments:
    name: A unique name for the generated summary node.
    data: A `Tensor` of any shape. Must be castable to `float64`.
    edges: Optional `Tensor` of shape `[bucket_count + 1]` specifying the
      boundaries of each bucket. If specified, `data` must be a `Tensor` of
      shape `[bucket_count]` containing the heights of each bucket. Note:
      specification of bucket_count is not necessary.
    bucket_count: Optional positive `int`. The output will have this
      many buckets, except in two edge cases. If there is no data, then
      there are no buckets. If there is data but all points have the
      same value, then there is one bucket whose left and right
      endpoints are the same.
    display_name: Optional name for this summary in TensorBoard, as a
      constant `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
      constant `str`. Markdown is supported. Defaults to empty.
    collections: Optional list of graph collections keys. The new
      summary op is added to these collections. Defaults to
      `[Graph Keys.SUMMARIES]`.

  Returns:
    A TensorFlow summary op.

  Raises:
    ValueError: If data is not rank 1 when `edges` is specified.
    ValueError: If the shape of data is not [bucket_count] or edges is not
      [bucket_count+1].
  """
  if display_name is None:
    display_name = name
  summary_metadata = metadata.create_summary_metadata(
      display_name=display_name, description=description)
  with tf.name_scope(name):
    if edges is None:
      tensor = _buckets(data, bucket_count=bucket_count)
    else:
      if len(data.get_shape()) != 1 or len(edges.get_shape()) != 1:
        raise ValueError('`data` and `edges` must be rank 1.')
      if data.get_shape()[0] != edges.get_shape()[0] - 1:
        raise ValueError(
            'Shapes of `data` and `edges` must be [bucket_count] and '
            '[bucket_count + 1], but are %s and %s.' % (data.get_shape(),
                                                        edges.get_shape()))
      edges = tf.cast(edges, tf.float64)
      data = tf.cast(data, tf.float64)
      tensor = tf.transpose(tf.stack([edges[:-1], edges[1:], data]))
    return tf.summary.tensor_summary(
        name='histogram_summary',
        tensor=tensor,
        collections=collections,
        summary_metadata=summary_metadata)


def pb(name,
       data,
       edges=None,
       bucket_count=None,
       display_name=None,
       description=None):
  """Create a histogram summary protobuf.

  Arguments:
    name: A unique name for the generated summary, including any desired
      name scopes.
    data: A `np.array` or array-like form of any shape. Must have type
      castable to `float`.
    edges: Optional `np.array` of shape `[bucket_count + 1]` specifying the
      boundaries of each bucket. If specified, `data` must be a `np.array` of
      shape `[bucket_count]` containing the heights of each bucket. Note:
      specification of bucket_count is not necessary.
    bucket_count: Optional positive `int`. The output will have this
      many buckets, except in two edge cases. If there is no data, then
      there are no buckets. If there is data but all points have the
      same value, then there is one bucket whose left and right
      endpoints are the same.
    display_name: Optional name for this summary in TensorBoard, as a
      `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
      `str`. Markdown is supported. Defaults to empty.

  Returns:
    A `tf.Summary` protobuf object.

  Raises:
    ValueError: If data is not rank 1 when `edges` is specified.
    ValueError: If the shape of data is not [bucket_count] or edges is not
      [bucket_count+1].
  """
  if bucket_count is None:
    bucket_count = DEFAULT_BUCKET_COUNT
  if edges is None:
    data = np.array(data).flatten().astype(float)
    if data.size == 0:
      buckets = np.array([]).reshape((0, 3))
    else:
      min_ = np.min(data)
      max_ = np.max(data)
      range_ = max_ - min_
      if range_ == 0:
        center = min_
        buckets = np.array([[center - 0.5, center + 0.5, float(data.size)]])
      else:
        bucket_width = range_ / bucket_count
        offsets = data - min_
        bucket_indices = np.floor(offsets / bucket_width).astype(int)
        clamped_indices = np.minimum(bucket_indices, bucket_count - 1)
        one_hots = (np.array([clamped_indices]).transpose() == np.arange(
            0, bucket_count))  # broadcast
        assert one_hots.shape == (data.size, bucket_count), (one_hots.shape,
                                                             (data.size,
                                                              bucket_count))
        bucket_counts = np.sum(one_hots, axis=0)
        edges = np.linspace(min_, max_, bucket_count + 1)
        left_edges = edges[:-1]
        right_edges = edges[1:]
        buckets = np.array([left_edges, right_edges, bucket_counts]).transpose()
  else:
    if len(data.shape) != 1 or len(edges.shape) != 1:
      raise ValueError('`data` and `edges` must be rank 1.')
    if data.shape[0] != edges.shape[0] - 1:
      raise ValueError(
          'Shapes of `data` and `edges` must be [bucket_count] and '
          '[bucket_count + 1], but are %s and %s.' % (data.shape, edges.shape))
    data = np.array(data).astype(float)
    edges = np.array(edges).astype(float)
    buckets = np.array([edges[:-1], edges[1:], data]).transpose()

  tensor = tf.make_tensor_proto(buckets, dtype=tf.float64)
  if display_name is None:
    display_name = name
  summary_metadata = metadata.create_summary_metadata(
      display_name=display_name, description=description)

  summary = tf.Summary()
  summary.value.add(
      tag='%s/histogram_summary' % name,
      metadata=summary_metadata,
      tensor=tensor)
  return summary
