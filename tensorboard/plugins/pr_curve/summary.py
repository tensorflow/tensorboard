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

from google.protobuf import json_format
from tensorboard.plugins.pr_curve import pr_curve_pb2

# A tiny value. Used to prevent division by 0 as well as to make precision 1
# when the threshold is 0.
_TINY_EPISILON = 1e-7

def op(
    tag,
    labels,
    predictions,
    num_thresholds=200,
    weights=None,
    num_classes=1,
    display_name=None,
    description=None):
  """Computes multi-class PR summaries for a list of thresholds in `[0, 1]`.

  Computes true/false positive/negative values for the given `predictions`
  against the ground truth `labels`, against a list of evenly distributed
  threshold values in `[0, 1]` of length `num_thresholds`.

  Each number in `predictions`, a float in `[0, 1]`, is compared with its
  corresponding label in `labels`, and counts as a single tp/fp/tn/fn value at
  each threshold. This is then multiplied with `weights` which can be used to
  reweight certain values, or more commonly used for masking values.

  This method supports multi-class classification (One PR curve line will
  be made for each class.), and when `num_classes > 1`, the last dimension
  of `labels` and `predictions` is the class dimension.

  NOTE(chizeng): This is a faster implementation of similar methods in
  `tf.contrib.metrics.streaming_XXX_at_thresholds`, where we assume the
  threshold values are evenly distributed and thereby can implement a `O(n+m)`
  algorithm instead of `O(n*m)` in both time and space, where `n` is the
  size of `labels` and `m` is the number of thresholds.

  Args:
    tag: A tag attached to the summary. Used by TensorBoard for organization.
    labels: The ground truth values, a `Tensor` whose dimensions must match
        `predictions`. Should be of type `bool`.
    predictions: A floating point `Tensor` whose values are in the range
        `[0, 1]`. Shape is arbitrary if `num_classes=1`; otherwise, the
        last dimension should be exactly `num_classes`.
    num_thresholds: Number of thresholds, evenly distributed in `[0, 1]`, to
        compute PR metrics for. Should be `>= 2`. This value should be a 
        constant integer value, not a Tensor that stores an integer.
    weights: Optional; If provided, a `Tensor` that has the same dtype as,
        and is broadcastable to, `predictions`.
    num_classes: Optional; Used when `predictions` is a multi-class classifier.
    display_name: The name displayed atop this PR curve in TensorBoard. The
        display_name is optional. `tag` will be used in its absence.
    description: Not yet supported; do not use. (Eventually: Optional
        long-form description for this summary. Markdown is supported.)

  Returns:
    A summary operation for use in a TensorFlow graph. The float32 tensor
    produced by the summary operation is of dimension (6, num_classes,
    num_thresholds). The first dimension (of length 6) is of the order:
    true positives, false positives, true negatives, false negatives,
    precision, recall.

  """
  weights = weights if weights is not None else 1.0
  dtype = predictions.dtype

  with tf.name_scope(tag, values=[labels, predictions, weights]):
    tf.assert_type(labels, tf.bool)
    # We cast to float to ensure we have 0.0 or 1.0.
    f_labels = tf.cast(labels, dtype)
    # Ensure predictions are all in range [0.0, 1.0].
    predictions = tf.minimum(1.0, tf.maximum(0.0, predictions))
    # Get weighted true/false labels.
    true_labels = f_labels * weights
    false_labels = (1.0 - f_labels) * weights

    # Before we begin, reshape everything to (num_values, num_classes).
    # We have to do this after weights multiplication since weights broadcast.
    shape = (-1, num_classes)
    predictions = tf.reshape(predictions, shape)
    true_labels = tf.reshape(true_labels, shape)
    false_labels = tf.reshape(false_labels, shape)

    # To compute TP/FP/TN/FN, we are measuring a classifier
    #   C(t) = (predictions >= t)
    # at each threshold 't'. So we have
    #   TP(t) = sum( C(t) * true_labels )
    #   FP(t) = sum( C(t) * false_labels )
    #
    # But, computing C(t) requires computation for each t. To make it fast,
    # observe that C(t) is a cumulative integral, and so if we have
    #   thresholds = [t_0, ..., t_{n-1}];  t_0 < ... < t_{n-1}
    # where n = num_thresholds, and if we can compute the bucket function
    #   B(i) = Sum( (predictions == t), t_i <= t < t{i+1} )
    # then we get
    #   C(t_i) = sum( B(j), j >= i )
    # which is the reversed cumulative sum in tf.cumsum().
    #
    # We can compute B(i) efficiently by taking advantage of the fact that
    # our thresholds are evenly distributed, in that
    #   width = 1.0 / (num_thresholds - 1)
    #   thresholds = [0.0, 1*width, 2*width, 3*width, ..., 1.0]
    # Given a prediction value p, we can map it to its bucket by
    #   bucket_index(p) = floor( p * (num_thresholds - 1) )
    # so we can use tf.scatter_add() to update the buckets in one pass.

    # First compute the bucket indices for each prediction value.
    bucket_indices = (
        tf.cast(tf.floor(predictions * (num_thresholds-1)), tf.int32))
    # Adjust indices by classes. For performance and simplicity, we keep
    # the buckets (see below) as 1D array representing the tp/fp buckets for
    # a (num_classes, num_thresholds) tensors.
    # So, for each index in bucket_indices, its real index into this 1D array is
    #   index + (num_thresholds * class_index)
    class_indices = tf.reshape(tf.range(num_classes), (1, num_classes))
    bucket_indices += num_thresholds * class_indices

    with tf.name_scope('variables'):
      # Now create the variables which correspond to the bucket values.
      # These are flat arrays with num_thresholds value per class.
      tp_buckets_v = tf.Variable(
          tf.zeros([num_classes * num_thresholds], dtype=dtype),
          name='tp_buckets',
          trainable=False,
          collections=[tf.GraphKeys.LOCAL_VARIABLES])
      fp_buckets_v = tf.Variable(
          tf.zeros([num_classes * num_thresholds], dtype=dtype),
          name='fp_buckets',
          trainable=False,
          collections=[tf.GraphKeys.LOCAL_VARIABLES])

    initialize_bucket_counts = tf.variables_initializer(
        [tp_buckets_v, fp_buckets_v])
    with tf.control_dependencies([initialize_bucket_counts]):
      # Create the non-flat views with class_index as first dimension.
      tp_buckets = tf.reshape(tp_buckets_v, (num_classes, -1))
      fp_buckets = tf.reshape(fp_buckets_v, (num_classes, -1))

      with tf.name_scope('update_op'):
        # Use scatter_add to update the buckets.
        update_tp = tf.scatter_add(
            tp_buckets_v, bucket_indices, true_labels, use_locking=True)
        update_fp = tf.scatter_add(
            fp_buckets_v, bucket_indices, false_labels, use_locking=True)

    with tf.control_dependencies([update_tp, update_fp]):
      with tf.name_scope('metrics'):
        thresholds = tf.cast(
            tf.linspace(0.0, 1.0, num_thresholds), dtype=dtype)
        # Set up the cumulative sums to compute the actual metrics.
        tp_buckets = tf.cast(tp_buckets, tf.float32)
        fp_buckets = tf.cast(fp_buckets, tf.float32)
        tp = tf.cumsum(tp_buckets, reverse=True, axis=1, name='tp')
        fp = tf.cumsum(fp_buckets, reverse=True, axis=1, name='fp')
        # fn = sum(true_labels) - tp
        #    = sum(tp_buckets) - tp
        #    = tp[:, 0] - tp
        # Similarly,
        # tn = fp[:, 0] - fp
        tn = tf.subtract(fp[:, 0:1], fp, name='tn')
        fn = tf.subtract(tp[:, 0:1], tp, name='fn')

        # Store the number of thresholds within the summary metadata because
        # that value is constant for all pr curve summaries with the same tag.
        summary_metadata = tf.SummaryMetadata(
            display_name=display_name if display_name is not None else tag,
            summary_description=description)
        pr_curve_plugin_data = pr_curve_pb2.PrCurvePluginData(
            num_thresholds=num_thresholds)
        summary_metadata.plugin_data.add(
            plugin_name='pr_curve',
            content=json_format.MessageToJson(pr_curve_plugin_data))

        precision = tf.divide(
            tf.maximum(_TINY_EPISILON, tp),
            tf.maximum(_TINY_EPISILON, tf.add(tp, fp)))

        # Use (1-fn/(tp+fn)) = tp/(tp+fn) so that at threshold, recall=1.
        recall = tf.subtract(
            1.0,
            tf.divide(fn, tf.maximum(_TINY_EPISILON, tf.add(tp, fn))))

        # Store values within a tensor. We store them in the order:
        # true positives, false positives, true negatives, false
        # negatives, precision, and recall.
        combined_data = tf.stack([tp, fp, tn, fn, precision, recall])

    return tf.summary.tensor_summary(
        name=tag,
        tensor=combined_data,
        summary_metadata=summary_metadata)
