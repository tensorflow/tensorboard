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
"""Tests the Tensorboard debugger data plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import binascii

import numpy as np
import six
import tensorflow as tf

from tensorboard.plugins.beholder import im_util
from tensorboard.plugins.debugger import tensor_helper


class TranslateDTypeTest(tf.test.TestCase):

  def testTranslateNumericDTypes(self):
    x = np.zeros([2, 2], dtype=np.float32)
    self.assertEqual('float32', tensor_helper.translate_dtype(x.dtype))
    x = np.zeros([2], dtype=np.int16)
    self.assertEqual('int16', tensor_helper.translate_dtype(x.dtype))
    x = np.zeros([], dtype=np.uint8)
    self.assertEqual('uint8', tensor_helper.translate_dtype(x.dtype))

  def testTranslateBooleanDType(self):
    x = np.zeros([2, 2], dtype=np.bool)
    self.assertEqual('bool', tensor_helper.translate_dtype(x.dtype))

  def testTranslateStringDType(self):
    x = np.array(['abc'], dtype=np.object)
    self.assertEqual('string', tensor_helper.translate_dtype(x.dtype))


class ProcessBuffersForDisplayTest(tf.test.TestCase):

  def testBinaryScalarBelowLimit(self):
    x = b'\x01\x02\x03'
    self.assertEqual(binascii.b2a_qp(x),
                     tensor_helper.process_buffers_for_display(x, 10))

  def testAsciiScalarBelowLimit(self):
    x = b'foo_bar'
    self.assertEqual(b'foo_bar',
                     tensor_helper.process_buffers_for_display(x, 10))

  def testBinaryScalarAboveLimit(self):
    x = b'\x01\x02\x03'
    self.assertEqual(
        binascii.b2a_qp(x[:2]) + b' (length-3 truncated at 2 bytes)',
        tensor_helper.process_buffers_for_display(x, 2))

  def testAsciiScalarAboveLimit(self):
    x = b'foo_bar'
    self.assertEqual(b'foo_ (length-7 truncated at 4 bytes)',
                     tensor_helper.process_buffers_for_display(x, 4))

  def testNestedArrayMixed(self):
    x = [[b'\x01\x02\x03', b'foo_bar'], [b'\x01', b'f']]
    self.assertEqual(
        [[b'=01=02 (length-3 truncated at 2 bytes)',
          b'fo (length-7 truncated at 2 bytes)'],
         [b'=01', b'f']], tensor_helper.process_buffers_for_display(x, 2))


class TensorHelperTest(tf.test.TestCase):

  def testArrayViewFloat2DNoSlicing(self):
    float_array = np.ones([3, 3], dtype=np.float32)
    dtype, shape, values = tensor_helper.array_view(float_array)
    self.assertEqual("float32", dtype)
    self.assertEqual((3, 3), shape)
    self.assertEqual(float_array.tolist(), values)

  def testArrayViewFloat2DWithSlicing(self):
    x = np.ones([4, 4], dtype=np.float64)
    y = np.zeros([4, 4], dtype=np.float64)
    float_array = np.concatenate((x, y), axis=1)

    dtype, shape, values = tensor_helper.array_view(
        float_array, slicing="[2:, :]")
    self.assertEqual("float64", dtype)
    self.assertEqual((2, 8), shape)
    self.assertAllClose(
        [[1, 1, 1, 1, 0, 0, 0, 0],
         [1, 1, 1, 1, 0, 0, 0, 0]], values)

  def testArrayViewInt3DWithSlicing(self):
    x = np.ones([4, 4], dtype=np.int32)
    int_array = np.zeros([3, 4, 4], dtype=np.int32)
    int_array[0, ...] = x
    int_array[1, ...] = 2 * x
    int_array[2, ...] = 3 * x

    dtype, shape, values = tensor_helper.array_view(
        int_array, slicing="[:, :, 2]")
    self.assertEqual("int32", dtype)
    self.assertEqual((3, 4), shape)
    self.assertEqual([[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]], values)

  def testArrayView2DWithSlicingAndImagePngMapping(self):
    x = np.ones([15, 16], dtype=np.int32)
    dtype, shape, data = tensor_helper.array_view(
        x, slicing="[:15:3, :16:2]", mapping="image/png")
    self.assertEqual("int32", dtype)
    self.assertEqual((5, 8), shape)
    decoded_x = im_util.decode_png(base64.b64decode(data))
    self.assertEqual((5, 8, 3), decoded_x.shape)
    self.assertEqual(np.uint8, decoded_x.dtype)
    self.assertAllClose(np.zeros([5, 8, 3]), decoded_x)

  def testImagePngMappingWorksForArrayWithOnlyOneElement(self):
    x = np.array([[-42]], dtype=np.int16)
    dtype, shape, data = tensor_helper.array_view(x, mapping="image/png")
    self.assertEqual("int16", dtype)
    self.assertEqual((1, 1), shape)
    decoded_x = im_util.decode_png(base64.b64decode(data))
    self.assertEqual((1, 1, 3), decoded_x.shape)
    self.assertEqual(np.uint8, decoded_x.dtype)
    self.assertAllClose(np.zeros([1, 1, 3]), decoded_x)

  def testImagePngMappingWorksForArrayWithInfAndNaN(self):
    x = np.array([[1.1, 2.2, np.inf], [-np.inf, 3.3, np.nan]], dtype=np.float32)
    dtype, shape, data = tensor_helper.array_view(x, mapping="image/png")
    self.assertEqual("float32", dtype)
    self.assertEqual((2, 3), shape)
    decoded_x = im_util.decode_png(base64.b64decode(data))
    self.assertEqual((2, 3, 3), decoded_x.shape)
    self.assertEqual(np.uint8, decoded_x.dtype)
    self.assertAllClose([0, 0, 0], decoded_x[0, 0, :])  # 1.1.
    self.assertAllClose([127, 127, 127], decoded_x[0, 1, :])  # 2.2.
    self.assertAllClose(tensor_helper.POSITIVE_INFINITY_RGB,
                        decoded_x[0, 2, :])  # +infinity.
    self.assertAllClose(tensor_helper.NEGATIVE_INFINITY_RGB,
                        decoded_x[1, 0, :])  # -infinity.
    self.assertAllClose([255, 255, 255], decoded_x[1, 1, :])  # 3.3.
    self.assertAllClose(tensor_helper.NAN_RGB, decoded_x[1, 2, :])  # nan.

  def testArrayViewSlicingDownNumericTensorToOneElement(self):
    x = np.array([[1.1, 2.2, np.inf], [-np.inf, 3.3, np.nan]], dtype=np.float32)
    dtype, shape, data = tensor_helper.array_view(x, slicing='[0,0]')
    self.assertEqual('float32', dtype)
    self.assertEqual(tuple(), shape)
    self.assertTrue(np.allclose(1.1, data))

  def testArrayViewSlicingStringTensorToNonScalarSubArray(self):
    # Construct a numpy array that corresponds to a TensorFlow string tensor
    # value.
    x = np.array([['foo', 'bar', 'qux'], ['baz', 'corge', 'grault']],
                 dtype=np.object)
    dtype, shape, data = tensor_helper.array_view(x, slicing='[:2, :2]')
    self.assertEqual('string', dtype)
    self.assertEqual((2, 2), shape)
    self.assertEqual([['foo', 'bar'], ['baz', 'corge']], data)

  def testArrayViewSlicingStringTensorToScalar(self):
    # Construct a numpy array that corresponds to a TensorFlow string tensor
    # value.
    x = np.array([['foo', 'bar', 'qux'], ['baz', 'corge', 'grault']],
                 dtype=np.object)
    dtype, shape, data = tensor_helper.array_view(x, slicing='[1, 1]')
    self.assertEqual('string', dtype)
    self.assertEqual((1, 1), shape)
    self.assertEqual([['corge']], data)

  def testArrayViewOnScalarString(self):
    # Construct a numpy scalar that corresponds to a TensorFlow string tensor
    # value.
    x = np.array('foo', dtype=np.object)
    dtype, shape, data = tensor_helper.array_view(x)
    self.assertEqual('string', dtype)
    self.assertEqual(tuple(), shape)
    self.assertEqual('foo', data)

  def testImagePngMappingWorksForArrayWithOnlyInfAndNaN(self):
    x = np.array([[np.nan, -np.inf], [np.inf, np.nan]], dtype=np.float32)
    dtype, shape, data = tensor_helper.array_view(x, mapping="image/png")
    self.assertEqual("float32", dtype)
    self.assertEqual((2, 2), shape)
    decoded_x = im_util.decode_png(base64.b64decode(data))
    self.assertEqual((2, 2, 3), decoded_x.shape)
    self.assertEqual(np.uint8, decoded_x.dtype)
    self.assertAllClose(tensor_helper.NAN_RGB, decoded_x[0, 0, :])  # nan.
    self.assertAllClose(tensor_helper.NEGATIVE_INFINITY_RGB,
                        decoded_x[0, 1, :])  # -infinity.
    self.assertAllClose(tensor_helper.POSITIVE_INFINITY_RGB,
                        decoded_x[1, 0, :])  # +infinity.
    self.assertAllClose(tensor_helper.NAN_RGB, decoded_x[1, 1, :])  # nan.

  def testImagePngMappingRaisesExceptionForEmptyArray(self):
    x = np.zeros([0, 0])
    with six.assertRaisesRegex(
        self, ValueError, r"Cannot encode an empty array .* \(0, 0\)"):
      tensor_helper.array_view(x, mapping="image/png")

  def testImagePngMappingRaisesExceptionForNonRank2Array(self):
    x = np.ones([2, 2, 2])
    with six.assertRaisesRegex(
        self, ValueError, r"Expected rank-2 array; received rank-3 array"):
      tensor_helper.array_to_base64_png(x)


class ArrayToBase64PNGTest(tf.test.TestCase):

  def testConvertHealthy2DArray(self):
    x = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    encoded_x = tensor_helper.array_to_base64_png(x)
    decoded_x = im_util.decode_png(base64.b64decode(encoded_x))
    self.assertEqual((3, 3, 3), decoded_x.shape)
    decoded_flat = decoded_x.flatten()
    self.assertEqual(0, np.min(decoded_flat))
    self.assertEqual(255, np.max(decoded_flat))

  def testConvertHealthy2DNestedList(self):
    x = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15]]
    encoded_x = tensor_helper.array_to_base64_png(x)
    decoded_x = im_util.decode_png(base64.b64decode(encoded_x))
    self.assertEqual((4, 4, 3), decoded_x.shape)
    decoded_flat = decoded_x.flatten()
    self.assertEqual(0, np.min(decoded_flat))
    self.assertEqual(255, np.max(decoded_flat))


class ParseTimeIndicesTest(tf.test.TestCase):

  def testParseSingleIntegerMinusOne(self):
    slicing = tensor_helper.parse_time_indices('-1')
    self.assertEqual(-1, slicing)

  def testParseSingleIntegerMinusOneWithBrackets(self):
    slicing = tensor_helper.parse_time_indices('[-1]')
    self.assertEqual(-1, slicing)

  def testParseSlicingWithStartAndStop(self):
    slicing = tensor_helper.parse_time_indices('[0:3]')
    self.assertEqual(slice(0, 3, None), slicing)
    slicing = tensor_helper.parse_time_indices('0:3')
    self.assertEqual(slice(0, 3, None), slicing)

  def testParseSlicingWithStep(self):
    slicing = tensor_helper.parse_time_indices('[::2]')
    self.assertEqual(slice(None, None, 2), slicing)
    slicing = tensor_helper.parse_time_indices('::2')
    self.assertEqual(slice(None, None, 2), slicing)

  def testParseSlicingWithOnlyStart(self):
    slicing = tensor_helper.parse_time_indices('[3:]')
    self.assertEqual(slice(3, None, None), slicing)
    slicing = tensor_helper.parse_time_indices('3:')
    self.assertEqual(slice(3, None, None), slicing)

  def testParseSlicingWithMinusOneStop(self):
    slicing = tensor_helper.parse_time_indices('[3:-1]')
    self.assertEqual(slice(3, -1, None), slicing)
    slicing = tensor_helper.parse_time_indices('3:-1')
    self.assertEqual(slice(3, -1, None), slicing)

  def testParseSlicingWithOnlyStop(self):
    slicing = tensor_helper.parse_time_indices('[:-2]')
    self.assertEqual(slice(None, -2, None), slicing)
    slicing = tensor_helper.parse_time_indices(':-2')
    self.assertEqual(slice(None, -2, None), slicing)

  def test2DSlicingLeadsToError(self):
    with self.assertRaises(ValueError):
      tensor_helper.parse_time_indices('[1:2, 3:4]')
    with self.assertRaises(ValueError):
      tensor_helper.parse_time_indices('1:2,3:4')


if __name__ == '__main__':
  tf.test.main()
