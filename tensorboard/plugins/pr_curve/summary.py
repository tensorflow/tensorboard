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
"""Precision--recall curves and TensorFlow operations to create them.

NOTE: This module is in beta, and its API is subject to change, but the
data that it stores to disk will be supported forever.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from google.protobuf import json_format
from tensorboard.plugins.pr_curve import plugin_data_pb2

# A tiny value. Used to prevent division by 0 as well as to make precision 1
# when the threshold is 0.
_TINY_EPISILON = 1e-7

def op(
    tag,
    labels,
    predictions,
    num_thresholds=None,
    weights=None,
    display_name=None,
    description=None,
    collections=None):
  """Create a PR curve summary op for a single binary classifier.

  Computes true/false positive/negative values for the given `predictions`
  against the ground truth `labels`, against a list of evenly distributed
  threshold values in `[0, 1]` of length `num_thresholds`.

  Each number in `predictions`, a float in `[0, 1]`, is compared with its
  corresponding boolean label in `labels`, and counts as a single tp/fp/tn/fn
  value at each threshold. This is then multiplied with `weights` which can be
  used to reweight certain values, or more commonly used for masking values.

  Args:
    tag: A tag attached to the summary. Used by TensorBoard for organization.
    labels: The ground truth values. A Tensor of `bool` values with arbitrary
        shape.
    predictions: A float32 `Tensor` whose values are in the range `[0, 1]`.
        Dimensions must match those of `labels`.
    num_thresholds: Number of thresholds, evenly distributed in `[0, 1]`, to
        compute PR metrics for. Should be `>= 2`. This value should be a 
        constant integer value, not a Tensor that stores an integer.
    weights: Optional float32 `Tensor`. Individual counts are multiplied by this
        value. This tensor must be either the same shape as or broadcastable to
        the `labels` tensor.
    display_name: Optional name for this summary in TensorBoard, as a
        constant `str`. Defaults to `name`.
    description: Optional long-form description for this summary, as a
        constant `str`. Markdown is supported. Defaults to empty.
    collections: Optional list of graph collections keys. The new
        summary op is added to these collections. Defaults to
        `[Graph Keys.SUMMARIES]`.

  Returns:
    A summary operation for use in a TensorFlow graph. The float32 tensor
    produced by the summary operation is of dimension (6, num_thresholds). The
    first dimension (of length 6) is of the order: true positives,
    false positives, true negatives, false negatives, precision, recall.

  """
  if num_thresholds is None:
    num_thresholds = 200

  if weights is None:
    weights = 1.0

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

    # Before we begin, flatten predictions.
    predictions = tf.reshape(predictions, [-1])

    # Shape the labels so they are broadcast-able for later multiplication.
    true_labels = tf.reshape(true_labels, [-1, 1])
    false_labels = tf.reshape(false_labels, [-1, 1])

    # To compute TP/FP/TN/FN, we are measuring a binary classifier
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

    # Compute the bucket indices for each prediction value.
    bucket_indices = tf.cast(
        tf.floor(predictions * (num_thresholds - 1)), tf.int32)
    
    # Bucket predictions.
    tp_buckets = tf.reduce_sum(
        tf.one_hot(bucket_indices, depth=num_thresholds) * true_labels,
        axis=0)
    fp_buckets = tf.reduce_sum(
        tf.one_hot(bucket_indices, depth=num_thresholds) * false_labels,
        axis=0)

    thresholds = tf.cast(
        tf.linspace(0.0, 1.0, num_thresholds), dtype=dtype)
    
    # Set up the cumulative sums to compute the actual metrics.
    tp = tf.cumsum(tp_buckets, reverse=True, name='tp')
    fp = tf.cumsum(fp_buckets, reverse=True, name='fp')
    # fn = sum(true_labels) - tp
    #    = sum(tp_buckets) - tp
    #    = tp[0] - tp
    # Similarly,
    # tn = fp[0] - fp
    tn = fp[0] - fp
    fn = tp[0] - tp

    # Store the number of thresholds within the summary metadata because
    # that value is constant for all pr curve summaries with the same tag.
    pr_curve_plugin_data = plugin_data_pb2.PrCurvePluginData(
        num_thresholds=num_thresholds)
    content = json_format.MessageToJson(pr_curve_plugin_data)
    summary_metadata = tf.SummaryMetadata(
        display_name=display_name if display_name is not None else tag,
        summary_description=description or '',
        plugin_data=tf.SummaryMetadata.PluginData(plugin_name='pr_curves',
                                                  content=content))

    precision = tf.maximum(_TINY_EPISILON, tp) / tf.maximum(
        _TINY_EPISILON, tp + fp)

    # Use (1-fn/(tp+fn)) = tp/(tp+fn) so that at threshold 1.0,
    # recall=1. Note that for the formulation on the right
    # when the threshold is 1, the numerator (tp) is 1, while
    # the denominator is 1 + some value very close to 0 (the
    # tiny epsilon value). The result of the division there is
    # going to be a value very close to 1 (but not quite 1), and
    # so we use the formulation on the left instead. In that case,
    # the division yields 0 when threshold=1.0 because fn is 0.
    recall = 1.0 - fn / tf.maximum(_TINY_EPISILON, tf.add(tp, fn))

    # Store values within a tensor. We store them in the order:
    # true positives, false positives, true negatives, false
    # negatives, precision, and recall.
    combined_data = tf.stack([tp, fp, tn, fn, precision, recall])

    return tf.summary.tensor_summary(
        name='pr_curves',
        tensor=combined_data,
        collections=collections,
        summary_metadata=summary_metadata)
