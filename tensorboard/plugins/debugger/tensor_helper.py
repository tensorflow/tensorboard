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
"""Helper methods for tensor data."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64

import numpy as np
from tensorflow.python.debug.cli import command_parser

from tensorboard import util


def numel(shape):
  """Obtain total number of elements from a tensor (ndarray) shape.

  Args:
    shape: A list or tuple represenitng a tensor (ndarray) shape.
  """
  output = 1
  for dim in shape:
    output *= dim
  return output


def parse_time_indices(s):
  """Parse a string as time indices.

  Args:
    s: A valid slicing string for time indices. E.g., '-1', '[:]', ':', '2:10'

  Returns:
    A slice object.

  Raises:
    ValueError: If `s` does not represent valid time indices.
  """
  if not s.startswith('['):
    s = '[' + s + ']'
  parsed = command_parser._parse_slices(s)
  if len(parsed) != 1:
    raise ValueError(
        'Invalid number of slicing objects in time indices (%d)' % len(parsed))
  else:
    return parsed[0]


def array_view(array, slicing=None, mapping=None):
  """View a slice or the entirety of an ndarray.

  Args:
    array: The input array, as an numpy.ndarray.
    slicing: Optional slicing string, e.g., "[:, 1:3, :]".
    mapping: Optional mapping string. Supported mappings:
      `None` or case-insensitive `'None'`: Unmapped nested list.
      `'image/png'`: Image encoding of a 2D sliced array or 3D sliced array
        with 3 as the last dimension. If the sliced array is not 2D or 3D with
        3 as the last dimension, a `ValueError` will be thrown.

  Returns:
    1. dtype as a `str`.
    2. shape of the sliced array, as a tuple of `int`s.
    3. the potentially sliced values, as a nested `list`.
  """

  dtype = str(array.dtype)
  sliced_array = (array[command_parser._parse_slices(slicing)] if slicing
                  else array)
  shape = sliced_array.shape
  if mapping == "image/png":
    if len(sliced_array.shape) == 2:
      return dtype, shape, array_to_base64_png(sliced_array)
    elif len(sliced_array.shape) == 3:
      raise NotImplementedError(
          "image/png mapping for 3D array has not been implemented")
    else:
      raise ValueError("Invalid rank for image/png mapping: %d" %
                       len(sliced_array.shape))
  elif mapping is None or mapping == '' or  mapping.lower() == 'none':
    return dtype, shape, sliced_array.tolist()
  else:
    raise ValueError("Invalid mapping: %s" % mapping)


def array_to_base64_png(array):
  """Convert an array into base64-enoded PNG image.

  Args:
    array: A 2D np.ndarray or nested list of items.

  Returns:
    A base64-encoded string the image. The image is grayscale if the array is
    2D. The image is RGB color if the image is 3D with lsat dimension equal to
    3.
  """
  # TODO(cais): Deal with 3D case.
  # TODO(cais): If there are None values in here, replace them with all NaNs.
  array = np.array(array, dtype=np.float32)
  assert len(array.shape) == 2

  healthy_indices = np.where(np.logical_and(np.logical_not(np.isnan(array)),
                                            np.logical_not(np.isinf(array))))
  # TODO(cais): Deal with case in which there is no health elements, i.e., all
  # elements are NaN of Inf.
  minval = np.min(array[healthy_indices])
  maxval = np.max(array[healthy_indices])
  # TODO(cais): Deal with the case in which minval == maxval.
  scaled = np.array((array - minval) / (maxval - minval) * 255, dtype=np.uint8)
  rgb = np.repeat(np.expand_dims(scaled, -1), 3, axis=-1)
  image_encoded = base64.b64encode(util.encode_png(rgb))
  return image_encoded
