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
"""Integration tests for the Scalars Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorboard as tb
import tensorflow as tf

class ScalarsAPITest(tf.test.TestCase):

  def test_summary_equivalent_from_op_or_api(self):
    sess = tf.Session()
    k = tf.constant(3.0)
    simple_op = tb.plugins.scalar.summary_op("foo", k)

    summary_from_op = tf.Summary()
    summary_from_op.ParseFromString(sess.run(simple_op))
    handcrafted_summary = tb.plugins.scalar.summary_pb("foo", 3.0)
    self.assertProtoEquals(summary_from_op, handcrafted_summary)

    with tf.name_scope("scope"):
      scoped_op = tb.plugins.scalar.summary_op("foo", k)

    scoped_summary = tf.Summary()
    scoped_summary.ParseFromString(sess.run(scoped_op))
    handcrafted_scoped = tb.plugins.scalar.summary_pb("scope/foo", 3.0)
    self.assertProtoEquals(scoped_summary, handcrafted_scoped)


if __name__ == '__main__':
  tf.test.main()
