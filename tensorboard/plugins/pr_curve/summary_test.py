# -*- coding: utf-8 -*-
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
"""Tests the op that generates pr_curve summaries."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from tensorboard.plugins.pr_curve import metadata
from tensorboard.plugins.pr_curve import summary


class PrCurveTest(tf.test.TestCase):

  def setUp(self):
    super(PrCurveTest, self).setUp()
    tf.reset_default_graph()
    np.random.seed(42)

  def pb_via_op(self, summary_op, feed_dict=None):
    with tf.Session() as sess:
      actual_pbtxt = sess.run(summary_op, feed_dict=feed_dict or {})
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto

  def normalize_summary_pb(self, pb):
    """Pass `pb`'s `TensorProto` through a marshalling roundtrip.
    `TensorProto`s can be equal in value even if they are not identical
    in representation, because data can be stored in either the
    `tensor_content` field or the `${dtype}_value` field. This
    normalization ensures a canonical form, and should be used before
    comparing two `Summary`s for equality.
    """
    result = tf.Summary()
    result.MergeFrom(pb)
    for value in result.value:
      if value.HasField('tensor'):
        new_tensor = tf.make_tensor_proto(tf.make_ndarray(value.tensor))
        value.ClearField('tensor')
        value.tensor.MergeFrom(new_tensor)
    return result

  def compute_and_check_summary_pb(self,
                                   name,
                                   labels,
                                   predictions,
                                   num_thresholds,
                                   weights=None,
                                   display_name=None,
                                   description=None,
                                   feed_dict=None):
    """Use both `op` and `pb` to get a summary, asserting equality.
    Returns:
      a `Summary` protocol buffer
    """
    labels_tensor = tf.constant(labels)
    predictions_tensor = tf.constant(predictions)
    weights_tensor = None if weights is None else tf.constant(weights)
    op = summary.op(
        name=name,
        labels=labels_tensor,
        predictions=predictions_tensor,
        num_thresholds=num_thresholds,
        weights=weights_tensor,
        display_name=display_name,
        description=description)
    pb = self.normalize_summary_pb(summary.pb(
        name=name,
        labels=labels,
        predictions=predictions,
        num_thresholds=num_thresholds,
        weights=weights,
        display_name=display_name,
        description=description))
    pb_via_op = self.normalize_summary_pb(
        self.pb_via_op(op, feed_dict=feed_dict))
    self.assertProtoEquals(pb, pb_via_op)
    return pb

  def verify_float_arrays_are_equal(self, expected, actual):
    # We use an absolute error instead of a relative one because the expected
    # values are small. The default relative error (trol) of 1e-7 yields many
    # undesired test failures.
    np.testing.assert_allclose(
        expected, actual, rtol=0, atol=1e-7)

  def test_metadata(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([True]),
        predictions=np.float32([0.42]),
        num_thresholds=3)
    summary_metadata = pb.value[0].metadata
    plugin_data = summary_metadata.plugin_data
    self.assertEqual('foo', summary_metadata.display_name)
    self.assertEqual('', summary_metadata.summary_description)
    self.assertEqual(metadata.PLUGIN_NAME, plugin_data.plugin_name)
    plugin_data = metadata.parse_plugin_metadata(
        summary_metadata.plugin_data.content)
    self.assertEqual(3, plugin_data.num_thresholds)

  def test_all_true_positives(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([True]),
        predictions=np.float32([1]),
        num_thresholds=3)
    expected = [
        [1.0, 1.0, 1.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_all_true_negatives(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([False]),
        predictions=np.float32([0]),
        num_thresholds=3)
    expected = [
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 1.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_all_false_positives(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([False]),
        predictions=np.float32([1]),
        num_thresholds=3)
    expected = [
        [0.0, 0.0, 0.0],
        [1.0, 1.0, 1.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_all_false_negatives(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([True]),
        predictions=np.float32([0]),
        num_thresholds=3)
    expected = [
        [1.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        [0.0, 1.0, 1.0],
        [1.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_many_values(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([True, False, False, True, True, True]),
        predictions=np.float32([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]),
        num_thresholds=3)
    expected = [
        [4.0, 3.0, 0.0],
        [2.0, 0.0, 0.0],
        [0.0, 2.0, 2.0],
        [0.0, 1.0, 4.0],
        [2.0 / 3.0, 1.0, 0.0],
        [1.0, 0.75, 0.0],
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_many_values_with_weights(self):
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([True, False, False, True, True, True]),
        predictions=np.float32([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]),
        num_thresholds=3,
        weights=np.float32([0.0, 0.5, 2.0, 0.0, 0.5, 1.0]))
    expected = [
        [1.5, 1.5, 0.0],
        [2.5, 0.0, 0.0],
        [0.0, 2.5, 2.5],
        [0.0, 0.0, 1.5],
        [0.375, 1.0, 0.0],
        [1.0, 1.0, 0.0]
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_exhaustive_random_values(self):
    # Most other tests use small and crafted predictions and labels.
    # This test exhaustively generates many data points.
    data_points = 420
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.random.uniform(size=(data_points,)) > 0.5,
        predictions=np.float32(np.random.uniform(size=(data_points,))),
        num_thresholds=5)
    expected = [
        [218.0, 162.0, 111.0, 55.0, 0.0],
        [202.0, 148.0, 98.0, 51.0, 0.0],
        [0.0, 54.0, 104.0, 151.0, 202.0],
        [0.0, 56.0, 107.0, 163.0, 218.0],
        [0.5190476, 0.5225806, 0.5311005, 0.5188679, 0.0],
        [1.0, 0.7431192, 0.5091743, 0.2522936, 0.0]
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_counts_below_1(self):
    """Tests support for counts below 1.

    Certain weights cause TP, FP, TN, FN counts to be below 1.
    """
    pb = self.compute_and_check_summary_pb(
        name='foo',
        labels=np.array([True, False, False, True, True, True]),
        predictions=np.float32([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]),
        num_thresholds=3,
        weights=np.float32([0.0, 0.1, 0.2, 0.1, 0.1, 0.0]))
    expected = [
        [0.2, 0.2, 0.0],
        [0.3, 0.0, 0.0],
        [0.0, 0.3, 0.3],
        [0.0, 0.0, 0.2],
        [0.4, 1.0, 0.0],
        [1.0, 1.0, 0.0]
    ]
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal(expected, values)

  def test_raw_data(self):
    # We pass these raw counts and precision/recall values.
    name = 'foo'
    true_positive_counts = [75, 64, 21, 5, 0]
    false_positive_counts = [150, 105, 18, 0, 0]
    true_negative_counts = [0, 45, 132, 150, 150]
    false_negative_counts = [0, 11, 54, 70, 75]
    precision = [0.3333333, 0.3786982, 0.5384616, 1.0, 0.0]
    recall = [1.0, 0.8533334, 0.28, 0.0666667, 0.0]
    num_thresholds = 5
    display_name = 'some_raw_values'
    description = 'We passed raw values into a summary op.'

    op = summary.raw_data_op(
        name=name,
        true_positive_counts=tf.constant(true_positive_counts),
        false_positive_counts=tf.constant(false_positive_counts),
        true_negative_counts=tf.constant(true_negative_counts),
        false_negative_counts=tf.constant(false_negative_counts),
        precision=tf.constant(precision),
        recall=tf.constant(recall),
        num_thresholds=num_thresholds,
        display_name=display_name,
        description=description)
    pb_via_op = self.normalize_summary_pb(self.pb_via_op(op))

    # Call the corresponding method that is decoupled from TensorFlow.
    pb = self.normalize_summary_pb(summary.raw_data_pb(
        name=name,
        true_positive_counts=true_positive_counts,
        false_positive_counts=false_positive_counts,
        true_negative_counts=true_negative_counts,
        false_negative_counts=false_negative_counts,
        precision=precision,
        recall=recall,
        num_thresholds=num_thresholds,
        display_name=display_name,
        description=description))

    # The 2 methods above should write summaries with the same data.
    self.assertProtoEquals(pb, pb_via_op)

    # Test the metadata.
    summary_metadata = pb.value[0].metadata
    self.assertEqual('some_raw_values', summary_metadata.display_name)
    self.assertEqual(
        'We passed raw values into a summary op.',
        summary_metadata.summary_description)
    self.assertEqual(
        metadata.PLUGIN_NAME, summary_metadata.plugin_data.plugin_name)

    plugin_data = metadata.parse_plugin_metadata(
        summary_metadata.plugin_data.content)
    self.assertEqual(5, plugin_data.num_thresholds)

    # Test the summary contents.
    values = tf.make_ndarray(pb.value[0].tensor)
    self.verify_float_arrays_are_equal([
        [75.0, 64.0, 21.0, 5.0, 0.0],  # True positives.
        [150.0, 105.0, 18.0, 0.0, 0.0],  # False positives.
        [0.0, 45.0, 132.0, 150.0, 150.0],  # True negatives.
        [0.0, 11.0, 54.0, 70.0, 75.0],  # False negatives.
        [0.3333333, 0.3786982, 0.5384616, 1.0, 0.0],  # Precision.
        [1.0, 0.8533334, 0.28, 0.0666667, 0.0],  # Recall.
    ], values)


class StreamingOpTest(tf.test.TestCase):

  def setUp(self):
    super(StreamingOpTest, self).setUp()
    tf.reset_default_graph()
    np.random.seed(1)

  def pb_via_op(self, summary_op):
    actual_pbtxt = summary_op.eval()
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto

  def tensor_via_op(self, summary_op):
    actual_pbtxt = summary_op.eval()
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto

  def test_matches_op(self):
    predictions = tf.constant([0.2, 0.4, 0.5, 0.6, 0.8], dtype=tf.float32)
    labels = tf.constant([False, True, True, False, True], dtype=tf.bool)

    pr_curve, update_op = summary.streaming_op(name='pr_curve',
                                               predictions=predictions,
                                               labels=labels,
                                               num_thresholds=10)
    expected_pr_curve = summary.op(name='pr_curve',
                                   predictions=predictions,
                                   labels=labels,
                                   num_thresholds=10)
    with self.test_session() as sess:
      sess.run(tf.local_variables_initializer())
      sess.run([update_op])

      proto = self.pb_via_op(pr_curve)
      expected_proto = self.pb_via_op(expected_pr_curve)

      # Need to detect and fix the automatic _1 appended to second namespace.
      self.assertEqual(proto.value[0].tag, 'pr_curve/pr_curves')
      self.assertEqual(expected_proto.value[0].tag, 'pr_curve_1/pr_curves')
      expected_proto.value[0].tag = 'pr_curve/pr_curves'

      self.assertProtoEquals(expected_proto, proto)

  def test_matches_op_with_updates(self):
    predictions = tf.constant([0.2, 0.4, 0.5, 0.6, 0.8], dtype=tf.float32)
    labels = tf.constant([False, True, True, False, True], dtype=tf.bool)
    pr_curve, update_op = summary.streaming_op(name='pr_curve',
                                               predictions=predictions,
                                               labels=labels,
                                               num_thresholds=10)

    complete_predictions = tf.tile(predictions, [3])
    complete_labels = tf.tile(labels, [3])
    expected_pr_curve = summary.op(name='pr_curve',
                                   predictions=complete_predictions,
                                   labels=complete_labels,
                                   num_thresholds=10)
    with self.test_session() as sess:
      sess.run(tf.local_variables_initializer())
      sess.run([update_op])
      sess.run([update_op])
      sess.run([update_op])

      proto = self.pb_via_op(pr_curve)
      expected_proto = self.pb_via_op(expected_pr_curve)

      # Need to detect and fix the automatic _1 appended to second namespace.
      self.assertEqual(proto.value[0].tag, 'pr_curve/pr_curves')
      self.assertEqual(expected_proto.value[0].tag, 'pr_curve_1/pr_curves')
      expected_proto.value[0].tag = 'pr_curve/pr_curves'

      self.assertProtoEquals(expected_proto, proto)

  def test_only_1_summary_generated(self):
    """Tests that the streaming op only generates 1 summary for PR curves.

    This test was made in response to a bug in which calling the streaming op
    actually introduced 2 tags.
    """
    predictions = tf.constant([0.2, 0.4, 0.5, 0.6, 0.8], dtype=tf.float32)
    labels = tf.constant([False, True, True, False, True], dtype=tf.bool)
    _, update_op = summary.streaming_op(name='pr_curve',
                                        predictions=predictions,
                                        labels=labels,
                                        num_thresholds=10)
    with self.test_session() as sess:
      sess.run(tf.local_variables_initializer())
      sess.run(update_op)
      summary_proto = tf.Summary()
      summary_proto.ParseFromString(sess.run(tf.summary.merge_all()))

    tags = [v.tag for v in summary_proto.value]
    # Only 1 tag should have been introduced.
    self.assertEqual(['pr_curve/pr_curves'], tags)


if __name__ == "__main__":
  tf.test.main()
