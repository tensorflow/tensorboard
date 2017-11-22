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
"""Unit tests for CommChannel."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import threading
import time

import tensorflow as tf

from tensorboard.plugins.debugger import comm_channel


class CommChannelTest(tf.test.TestCase):

  def testGetOutgoingWithInvalidPosLeadsToAssertionError(self):
    channel = comm_channel.CommChannel()
    with self.assertRaises(ValueError):
      channel.get_outgoing(0)
    with self.assertRaises(ValueError):
      channel.get_outgoing(-1)

  def testOutgoingSerialPutOneAndGetOne(self):
    channel = comm_channel.CommChannel()
    channel.put_outgoing('A')
    self.assertEqual(('A', 1), channel.get_outgoing(1))

  def testOutgoingSerialPutTwoGetOne(self):
    channel = comm_channel.CommChannel()
    channel.put_outgoing('A')
    channel.put_outgoing('B')
    channel.put_outgoing('C')
    self.assertEqual(('A', 3), channel.get_outgoing(1))
    self.assertEqual(('B', 3), channel.get_outgoing(2))
    self.assertEqual(('C', 3), channel.get_outgoing(3))

  def testOutgoingConcurrentPutAndOneGetter(self):
    channel = comm_channel.CommChannel()

    result = {'outgoing': []}
    def get_two():
      result['outgoing'].append(channel.get_outgoing(1))
      result['outgoing'].append(channel.get_outgoing(2))

    t = threading.Thread(target=get_two)
    t.start()
    channel.put_outgoing('A')
    time.sleep(0.025)  # Greater than the default polling interval (0.01).
    channel.put_outgoing('B')
    t.join()
    self.assertEqual([('A', 1), ('B', 2)], result['outgoing'])

  def testOutgoingConcurrentPutAndTwoGetters(self):
    channel = comm_channel.CommChannel()

    result1 = {'outgoing': []}
    result2 = {'outgoing': []}
    def getter1():
      result1['outgoing'].append(channel.get_outgoing(1))
      result1['outgoing'].append(channel.get_outgoing(2))
    def getter2():
      result2['outgoing'].append(channel.get_outgoing(1))
      result2['outgoing'].append(channel.get_outgoing(2))

    t1 = threading.Thread(target=getter1)
    t1.start()
    t2 = threading.Thread(target=getter2)
    t2.start()

    channel.put_outgoing('A')
    time.sleep(0.025)  # Greater than the default polling interval (0.01).
    channel.put_outgoing('B')
    t1.join()
    t2.join()

    self.assertEqual([('A', 1), ('B', 2)], result1['outgoing'])
    self.assertEqual([('A', 1), ('B', 2)], result2['outgoing'])

  def testIncomingQueue(self):
    channel = comm_channel.CommChannel()

    result = {'incoming': None}
    def get_one():
      result['incoming'] = channel.get_incoming()

    t = threading.Thread(target=get_one)
    t.start()
    channel.put_incoming('Z')
    t.join()
    self.assertEqual('Z', result['incoming'])


if __name__ == '__main__':
  tf.test.main()
