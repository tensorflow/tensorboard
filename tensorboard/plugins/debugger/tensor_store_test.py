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
"""Tests the TensorBoard Debugger Plugin Tensor Store Module."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64

import numpy as np
import tensorflow as tf
from tensorflow.python.debug.lib import debug_data

from tensorboard.plugins.beholder import im_util
from tensorboard.plugins.debugger import tensor_store


class WatchStoreTest(tf.test.TestCase):

  def testAlwaysKeepsOneValueInMemory(self):
    watch_key = 'Dense/BiasAdd:0:DebugIdentity'
    watch_store = tensor_store._WatchStore(watch_key, mem_bytes_limit=50)

    value = np.eye(3, dtype=np.float64)
    self.assertEqual(72, value.nbytes)
    self.assertEqual(0, watch_store.num_total())
    self.assertEqual(0, watch_store.num_in_memory())
    self.assertEqual(0, watch_store.num_discarded())

    watch_store.add(value)
    self.assertEqual(1, watch_store.num_total())
    self.assertEqual(1, watch_store.num_in_memory())
    self.assertEqual(0, watch_store.num_discarded())
    self.assertAllEqual([value], watch_store.query(0))
    self.assertAllEqual([value], watch_store.query([0]))
    with self.assertRaises(IndexError):
      watch_store.query([1])

    watch_store.add(value * 2)
    self.assertEqual(2, watch_store.num_total())
    self.assertEqual(1, watch_store.num_in_memory())
    self.assertEqual(1, watch_store.num_discarded())
    self.assertEqual([None], watch_store.query([0]))
    self.assertIsNone(watch_store.query([0, 1])[0])
    self.assertAllEqual(value * 2, watch_store.query([0, 1])[-1])
    with self.assertRaises(IndexError):
      watch_store.query(2)

  def testDiscarding(self):
    watch_key = 'Dense/BiasAdd:0:DebugIdentity'
    watch_store = tensor_store._WatchStore(watch_key, mem_bytes_limit=150)

    value = np.eye(3, dtype=np.float64)
    self.assertEqual(72, value.nbytes)

    watch_store.add(value)
    watch_store.add(value * 2)
    self.assertEqual(2, watch_store.num_total())
    self.assertEqual(2, watch_store.num_in_memory())
    self.assertEqual(0, watch_store.num_discarded())
    self.assertAllEqual([value], watch_store.query([0]))
    self.assertAllEqual([value, value * 2], watch_store.query([0, 1]))
    with self.assertRaises(IndexError):
      watch_store.query(2)

    watch_store.add(value * 3)
    self.assertEqual(3, watch_store.num_total())
    self.assertEqual(2, watch_store.num_in_memory())
    self.assertEqual(1, watch_store.num_discarded())
    self.assertEqual([None], watch_store.query([0]))
    result = watch_store.query([0, 1])
    self.assertIsNone(result[0])
    self.assertAllEqual(value * 2, result[1])
    result = watch_store.query([0, 1, 2])
    self.assertIsNone(result[0])
    self.assertAllEqual([value * 2, value * 3], result[1:])
    with self.assertRaises(IndexError):
      watch_store.query(3)

    watch_store.add(value * 4)
    self.assertEqual(4, watch_store.num_total())
    self.assertEqual(2, watch_store.num_in_memory())
    self.assertEqual(2, watch_store.num_discarded())
    self.assertEqual([None], watch_store.query([0]))
    result = watch_store.query([0, 1])
    self.assertIsNone(result[0])
    self.assertIsNone(result[1])
    result = watch_store.query([0, 1, 2])
    self.assertIsNone(result[0])
    self.assertIsNone(result[1])
    self.assertAllEqual(value * 3, result[2])
    result = watch_store.query([0, 1, 2, 3])
    self.assertIsNone(result[0])
    self.assertIsNone(result[1])
    self.assertAllEqual(value * 3, result[2])
    self.assertAllEqual(value * 4, result[3])
    with self.assertRaises(IndexError):
      watch_store.query(4)

  def testAddAndQueryUnitializedTensor(self):
    watch_key = 'Dense/Bias:0:DebugIdentity'
    watch_store = tensor_store._WatchStore(watch_key, mem_bytes_limit=50)
    uninitialized_value = debug_data.InconvertibleTensorProto(
        None, initialized=False)
    watch_store.add(uninitialized_value)
    initialized_value = np.zeros([3], dtype=np.float64)
    watch_store.add(initialized_value)
    result = watch_store.query([0, 1])
    self.assertEqual(2, len(result))
    self.assertIsInstance(result[0], debug_data.InconvertibleTensorProto)
    self.assertAllClose(initialized_value, result[1])


class TensorHelperTest(tf.test.TestCase):

  def testAddAndQuerySingleTensor(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data = np.array([[1, 2], [3, 4]])
    store.add(watch_key, data)
    self.assertAllClose([data], store.query(watch_key))

  def testAddAndQuerySingleTensorWithSlicing(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data = np.array([[1, 2], [3, 4]])
    store.add(watch_key, data)
    self.assertAllClose([[2, 4]], store.query(watch_key, slicing="[:, 1]"))

  def testAddAndQueryMultipleTensorForSameWatchKey(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data1 = np.array([[1, 2], [3, 4]])
    data2 = np.array([[-1, -2], [-3, -4]])
    store.add(watch_key, data1)
    store.add(watch_key, data2)

    self.assertAllClose([data2], store.query(watch_key))
    self.assertAllClose([data1], store.query(watch_key, time_indices='0'))
    self.assertAllClose([data2], store.query(watch_key, time_indices='1'))
    self.assertAllClose([data2], store.query(watch_key, time_indices='-1'))

  def testAddAndQueryMultipleTensorForSameWatchKeyWithSlicing(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data1 = np.array([[1, 2], [3, 4]])
    data2 = np.array([[-1, -2], [-3, -4]])
    store.add(watch_key, data1)
    store.add(watch_key, data2)

    self.assertAllClose(
        [[2, 4], [-2, -4]],
        store.query(watch_key, time_indices='0:2', slicing="[:,1]"))

  def testQueryMultipleTensorsAtOnce(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data1 = np.array([[1, 2], [3, 4]])
    data2 = np.array([[-1, -2], [-3, -4]])
    store.add(watch_key, data1)
    store.add(watch_key, data2)

    self.assertAllClose(
        [[[1, 2], [3, 4]], [[-1, -2], [-3, -4]]],
        store.query(watch_key, time_indices='[0:2]'))

  def testQueryNonexistentWatchKey(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data = np.array([[1, 2], [3, 4]])
    store.add(watch_key, data)
    with self.assertRaises(KeyError):
      store.query("B:0:DebugIdentity")

  def testQueryInvalidTimeIndex(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    data = np.array([[1, 2], [3, 4]])
    store.add(watch_key, data)
    with self.assertRaises(IndexError):
      store.query("A:0:DebugIdentity", time_indices='10')

  def testQeuryWithTimeIndicesStop(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    store.add(watch_key, np.array(1))
    store.add(watch_key, np.array(3))
    store.add(watch_key, np.array(3))
    store.add(watch_key, np.array(7))
    self.assertAllClose([1, 3, 3], store.query(watch_key, time_indices=':3:'))

  def testQeuryWithTimeIndicesStopAndStep(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    store.add(watch_key, np.array(1))
    store.add(watch_key, np.array(3))
    store.add(watch_key, np.array(3))
    store.add(watch_key, np.array(7))
    self.assertAllClose([3, 7], store.query(watch_key, time_indices='1::2'))

  def testQeuryWithTimeIndicesAllRange(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    store.add(watch_key, np.array(1))
    store.add(watch_key, np.array(3))
    store.add(watch_key, np.array(3))
    store.add(watch_key, np.array(7))
    self.assertAllClose([1, 3, 3, 7], store.query(watch_key, time_indices=':'))

  def testQuery1DTensorHistoryWithImagePngMapping(self):
    store = tensor_store.TensorStore()
    watch_key = "A:0:DebugIdentity"
    store.add(watch_key, np.array([0, 2, 4, 6, 8]))
    store.add(watch_key, np.array([1, 3, 5, 7, 9]))
    output = store.query(watch_key, time_indices=':', mapping='image/png')
    decoded = im_util.decode_png(base64.b64decode(output))
    self.assertEqual((2, 5, 3), decoded.shape)

  def testTensorValuesExceedingMemBytesLimitAreDiscarded(self):
    store = tensor_store.TensorStore(watch_mem_bytes_limit=150)
    watch_key = "A:0:DebugIdentity"
    value = np.eye(3, dtype=np.float64)
    self.assertEqual(72, value.nbytes)
    store.add(watch_key, value)
    self.assertAllEqual([value], store.query(watch_key, time_indices=':'))

    store.add(watch_key, value * 2)
    self.assertAllEqual([value, value * 2],
                        store.query(watch_key, time_indices=':'))

    store.add(watch_key, value * 3)
    result = store.query(watch_key, time_indices=':')
    self.assertIsNone(result[0])
    self.assertAllEqual([value * 2, value * 3], result[1:])


if __name__ == '__main__':
  tf.test.main()
