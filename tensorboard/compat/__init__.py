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

"""Compatibility interfaces for TensorBoard.

This module provides logic for importing variations on the TensorFlow APIs, as
lazily loaded imports to help avoid circular dependency issues and defer the
search and loading of the module until necessary.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import importlib as _importlib

import tensorboard.lazy as _lazy


@_lazy.lazy_load('tensorboard.compat.tf')
def tf():
  """Provide the root module of a TF-like API for use within TensorBoard.

  By default this is equivalent to `import tensorflow as tf`, but it can be used
  in combination with //tensorboard/compat:tensorflow (to fall back to a stub TF
  API implementation if the real one is not available) or with
  //tensorboard/compat:no_tensorflow (to force unconditional use of the stub).

  Returns:
    The root module of a TF-like API, if available.

  Raises:
    ImportError: if a TF-like API is not available.
  """
  try:
    from tensorboard.compat import notf  # pylint: disable=g-import-not-at-top
  except ImportError:
    try:
      import tensorflow  # pylint: disable=g-import-not-at-top
      return tensorflow
    except ImportError:
      pass
  from tensorboard.compat import tensorflow_stub  # pylint: disable=g-import-not-at-top
  return tensorflow_stub


@_lazy.lazy_load('tensorboard.compat.tf2')
def tf2():
  """Provide the root module of a TF-2.0 API for use within TensorBoard.

  Returns:
    The root module of a TF-2.0 API, if available.

  Raises:
    ImportError: if a TF-2.0 API is not available.
  """
  # Import the `tf` compat API from this file and check if it's already TF 2.0.
  if tf.__version__.startswith('2.'):
    return tf
  elif hasattr(tf, 'compat') and hasattr(tf.compat, 'v2'):
    # As a fallback, try `tensorflow.compat.v2` if it's defined.
    return tf.compat.v2
  raise ImportError('cannot import tensorflow 2.0 API')


# TODO(https://github.com/tensorflow/tensorboard/issues/1711): remove this
@_lazy.lazy_load('tensorboard.compat._pywrap_tensorflow')
def _pywrap_tensorflow():
  """Provide pywrap_tensorflow access in TensorBoard.

  pywrap_tensorflow cannot be accessed from tf.python.pywrap_tensorflow
  and needs to be imported using
  `from tensorflow.python import pywrap_tensorflow`. Therefore, we provide
  a separate accessor function for it here.

  NOTE: pywrap_tensorflow is not part of TensorFlow API and this
  dependency will go away soon.

  Returns:
    pywrap_tensorflow import, if available.

  Raises:
    ImportError: if we couldn't import pywrap_tensorflow.
  """
  try:
    from tensorboard.compat import notf  # pylint: disable=g-import-not-at-top
  except ImportError:
    try:
      from tensorflow.python import pywrap_tensorflow  # pylint: disable=g-import-not-at-top
      return pywrap_tensorflow
    except ImportError:
      pass
  from tensorboard.compat.tensorflow_stub import pywrap_tensorflow  # pylint: disable=g-import-not-at-top
  return pywrap_tensorflow
