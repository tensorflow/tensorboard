# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Lite demo for TensorBoard."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import numpy as np
import tensorflow as tf


INPUT_SHAPE = (224, 224, 3)
INPUT_NAME = 'input_image'
OUTPUT_NAME = 'prob'

# Tensor name used for TF Lite conversion.
INPUT_TENSOR_ARRAYS = ['input_image']
OUTPUT_TENSOR_ARRAYS = ['prob/Sigmoid']


def generate_run(logdir, export_dir=None):
  """Generates a test model in logdir, and (optionally) exports saved model."""
  tf.keras.backend.clear_session()

  x, y = np.ones((10,) + INPUT_SHAPE), np.ones((10, 1))
  val_x, val_y = np.ones((4,) + INPUT_SHAPE), np.ones((4, 1))

  model = tf.keras.Sequential([
      tf.keras.layers.InputLayer(INPUT_SHAPE, name=INPUT_NAME),
      tf.keras.layers.Conv2D(128, 1, name="conv_2d"),
      tf.keras.layers.GlobalMaxPooling2D(name="max_pool"),
      tf.keras.layers.Dense(1, activation='sigmoid', name=OUTPUT_NAME),
  ], name="image_classification_model")
  model.compile('adam', 'binary_crossentropy')

  callbacks = [tf.keras.callbacks.TensorBoard(logdir,write_graph=True)]
  model.fit(
      x,
      y,
      validation_data=(val_x, val_y),
      batch_size=2,
      epochs=1,
      callbacks=callbacks)
  if export_dir:
  	tf.keras.experimental.export_saved_model(model, export_dir)
  return model
