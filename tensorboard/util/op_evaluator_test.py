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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow.compat.v1 as tf

from tensorboard.util import op_evaluator

class PersistentOpEvaluatorTest(tf.test.TestCase):

  def setUp(self):
    super(PersistentOpEvaluatorTest, self).setUp()

    patch = tf.test.mock.patch('tensorflow.compat.v1.Session', wraps=tf.Session)
    patch.start()
    self.addCleanup(patch.stop)

    class Squarer(op_evaluator.PersistentOpEvaluator):

      def __init__(self):
        super(Squarer, self).__init__()
        self._input = None
        self._squarer = None

      def initialize_graph(self):
        self._input = tf.placeholder(tf.int32)
        self._squarer = tf.square(self._input)

      def run(self, xs):  # pylint: disable=arguments-differ
        return self._squarer.eval(feed_dict={self._input: xs})

    self._square = Squarer()

  def test_preserves_existing_session(self):
    with tf.Session() as sess:
      op = tf.reduce_sum(input_tensor=[2, 2])
      self.assertIs(sess, tf.get_default_session())

      result = self._square(123)
      self.assertEqual(123 * 123, result)

      self.assertIs(sess, tf.get_default_session())
      number_of_lights = sess.run(op)
      self.assertEqual(number_of_lights, 4)

  def test_lazily_initializes_sessions(self):
    self.assertEqual(tf.Session.call_count, 0)

  def test_reuses_sessions(self):
    self._square(123)
    self.assertEqual(tf.Session.call_count, 1)
    self._square(234)
    self.assertEqual(tf.Session.call_count, 1)


if __name__ == '__main__':
  tf.test.main()
