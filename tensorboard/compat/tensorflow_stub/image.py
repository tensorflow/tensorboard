# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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
"""Image methods.

Primarily used to resize images for the various plugins.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import scipy as sp


class ResizeImagesResponse(object):
    # Only methods needed for TensorBoard are implemented.

    def __init__(self, images, size):
        self.images = images
        self.size = size

    def eval(self, session):
        # images = ops.convert_to_tensor(images, name='images')
        images = np.array(self.images)
        images_shape = images.shape
        if images_shape is None or len(images_shape) < 3 or len(images_shape) > 4:
            raise ValueError('\'images\' contains no shape.')
        # TODO(shlens): Migrate this functionality to the underlying Op's.
        is_batch = True
        if len(images_shape) == 3:
            is_batch = False
            images = np.expand_dims(images, axis=0)
        elif len(images_shape) != 4:
            raise ValueError('\'images\' must have either 3 or 4 dimensions.')

        _, height, width, _ = images_shape

        size = np.array(self.size)

        try:
            size = size.astype(np.int32)
        except (TypeError, ValueError):
            raise ValueError('\'size\' must be a 1-D int32 Tensor')
        if not size.get_shape().is_compatible_with([2]):
            raise ValueError('\'size\' must be a 1-D Tensor of 2 elements: '
                             'new_height, new_width')
        # size_const_as_shape = tensor_util.constant_value_as_shape(size)
        # new_height_const = size_const_as_shape[0].value
        # new_width_const = size_const_as_shape[1].value
        new_height_const = size[0]
        new_width_const = size[1]

        # If we can determine that the height and width will be unmodified by
        # this transformation, we avoid performing the resize.
        if all(x is not None
           for x in [new_width_const, width, new_height_const, height]) and (
               width == new_width_const and height == new_height_const):
            if not is_batch:
                images = np.squeeze(images, axis=0)
            return images

        images = sp.misc.imresize(images, size, 'bilinear')
        if not is_batch:
            images = np.squeeze(images, axis=0)
        return images


def resize_images(images, size):
    """Resize `images` to `size`.

    Resized images will be distorted if their original aspect ratio is not
    the same as `size`.

    Args:
    images: 4-D Tensor of shape `[batch, height, width, channels]` or
            3-D Tensor of shape `[height, width, channels]`.
    size: A 1-D int32 Tensor of 2 elements: `new_height, new_width`.  The
          new size for the images.

    Raises:
    ValueError: if the shape of `images` is incompatible with the
      shape arguments to this function
    ValueError: if `size` has invalid shape or type.
    """
    return ResizeImagesResponse(images, size)
