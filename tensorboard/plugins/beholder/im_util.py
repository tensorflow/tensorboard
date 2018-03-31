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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import threading

import numpy as np
import tensorflow as tf

from tensorboard.plugins.beholder import colormaps


# pylint: disable=not-context-manager

def global_extrema(arrays):
  return min([x.min() for x in arrays]), max([x.max() for x in arrays])


def scale_sections(sections, scaling_scope):
  '''
  input: unscaled sections.
  returns: sections scaled to [0, 255]
  '''
  new_sections = []

  if scaling_scope == 'layer':
    for section in sections:
      new_sections.append(scale_image_for_display(section))

  elif scaling_scope == 'network':
    global_min, global_max = global_extrema(sections)

    for section in sections:
      new_sections.append(scale_image_for_display(section,
                                                  global_min,
                                                  global_max))
  return new_sections


def scale_image_for_display(image, minimum=None, maximum=None):
  image = image.astype(float)

  minimum = image.min() if minimum is None else minimum
  image -= minimum

  maximum = image.max() if maximum is None else maximum

  if maximum == 0:
    return image
  else:
    image *= 255 / maximum
    return image.astype(np.uint8)


def pad_to_shape(array, shape, constant=245):
  padding = []

  for actual_dim, target_dim in zip(array.shape, shape):
    start_padding = 0
    end_padding = target_dim - actual_dim

    padding.append((start_padding, end_padding))

  return np.pad(array, padding, mode='constant', constant_values=constant)


def apply_colormap(image, colormap='magma'):
  if colormap == 'grayscale':
    return image
  cm = getattr(colormaps, colormap)
  return image if cm is None else cm[image]


# Taken from https://github.com/tensorflow/tensorboard/blob/
#            /28f58888ebb22e2db0f4f1f60cd96138ef72b2ef/tensorboard/util.py

# Modified by Chris Anderson to not use the GPU.
class PersistentOpEvaluator(object):
  """Evaluate a fixed TensorFlow graph repeatedly, safely, efficiently.
  Extend this class to create a particular kind of op evaluator, like an
  image encoder. In `initialize_graph`, create an appropriate TensorFlow
  graph with placeholder inputs. In `run`, evaluate this graph and
  return its result. This class will manage a singleton graph and
  session to preserve memory usage, and will ensure that this graph and
  session do not interfere with other concurrent sessions.
  A subclass of this class offers a threadsafe, highly parallel Python
  entry point for evaluating a particular TensorFlow graph.
  Example usage:
      class FluxCapacitanceEvaluator(PersistentOpEvaluator):
        \"\"\"Compute the flux capacitance required for a system.
        Arguments:
          x: Available power input, as a `float`, in jigawatts.
        Returns:
          A `float`, in nanofarads.
        \"\"\"
        def initialize_graph(self):
          self._placeholder = tf.placeholder(some_dtype)
          self._op = some_op(self._placeholder)
        def run(self, x):
          return self._op.eval(feed_dict: {self._placeholder: x})
      evaluate_flux_capacitance = FluxCapacitanceEvaluator()
      for x in xs:
        evaluate_flux_capacitance(x)
  """

  def __init__(self):
    super(PersistentOpEvaluator, self).__init__()
    self._session = None
    self._initialization_lock = threading.Lock()


  def _lazily_initialize(self):
    """Initialize the graph and session, if this has not yet been done."""
    with self._initialization_lock:
      if self._session:
        return
      graph = tf.Graph()
      with graph.as_default():
        self.initialize_graph()

      config = tf.ConfigProto(device_count={'GPU': 0})
      self._session = tf.Session(graph=graph, config=config)


  def initialize_graph(self):
    """Create the TensorFlow graph needed to compute this operation.
    This should write ops to the default graph and return `None`.
    """
    raise NotImplementedError('Subclasses must implement "initialize_graph".')


  def run(self, *args, **kwargs):
    """Evaluate the ops with the given input.
    When this function is called, the default session will have the
    graph defined by a previous call to `initialize_graph`. This
    function should evaluate any ops necessary to compute the result of
    the query for the given *args and **kwargs, likely returning the
    result of a call to `some_op.eval(...)`.
    """
    raise NotImplementedError('Subclasses must implement "run".')


  def __call__(self, *args, **kwargs):
    self._lazily_initialize()
    with self._session.as_default():
      return self.run(*args, **kwargs)


class PNGDecoder(PersistentOpEvaluator):

  def __init__(self):
    super(PNGDecoder, self).__init__()
    self._image_placeholder = None
    self._decode_op = None


  def initialize_graph(self):
    self._image_placeholder = tf.placeholder(dtype=tf.string)
    self._decode_op = tf.image.decode_png(self._image_placeholder)


  # pylint: disable=arguments-differ
  def run(self, image):
    return self._decode_op.eval(feed_dict={
        self._image_placeholder: image,
    })


class PNGEncoder(PersistentOpEvaluator):

  def __init__(self):
    super(PNGEncoder, self).__init__()
    self._image_placeholder = None
    self._encode_op = None


  def initialize_graph(self):
    self._image_placeholder = tf.placeholder(dtype=tf.uint8)
    self._encode_op = tf.image.encode_png(self._image_placeholder)


  # pylint: disable=arguments-differ
  def run(self, image):
    if len(image.shape) == 2:
      image = image.reshape([image.shape[0], image.shape[1], 1])

    return self._encode_op.eval(feed_dict={
        self._image_placeholder: image,
    })


class Resizer(PersistentOpEvaluator):

  def __init__(self):
    super(Resizer, self).__init__()
    self._image_placeholder = None
    self._size_placeholder = None
    self._resize_op = None


  def initialize_graph(self):
    self._image_placeholder = tf.placeholder(dtype=tf.float32)
    self._size_placeholder = tf.placeholder(dtype=tf.int32)
    self._resize_op = tf.image.resize_nearest_neighbor(self._image_placeholder,
                                                       self._size_placeholder)

  # pylint: disable=arguments-differ
  def run(self, image, height, width):
    if len(image.shape) == 2:
      image = image.reshape([image.shape[0], image.shape[1], 1])

    resized = np.squeeze(self._resize_op.eval(feed_dict={
        self._image_placeholder: [image],
        self._size_placeholder: [height, width]
    }))

    return resized


decode_png = PNGDecoder()
encode_png = PNGEncoder()
resize = Resizer()


def read_image(filename):
  with tf.gfile.Open(filename, 'rb') as image_file:
    return np.array(decode_png(image_file.read()))


def write_image(array, filename):
  with tf.gfile.Open(filename, 'w') as image_file:
    image_file.write(encode_png(array))


def get_image_relative_to_script(filename):
  script_directory = os.path.dirname(__file__)
  filename = os.path.join(script_directory, 'resources', filename)

  return read_image(filename)
