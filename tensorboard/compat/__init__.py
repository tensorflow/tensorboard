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

This module provides logic for importing variations on the TensorFlow APIs.

The alias `tf` is for the main TF API used by TensorBoard. By default this will
be the result of `import tensorflow as tf`, or undefined if that fails. This
can be used in combination with //tensorboard/compat:tensorflow (to fall back to
a stub TF API implementation if the real one is not available) and
//tensorboard/compat:no_tensorflow (to use the stub TF API unconditionally).

The function `import_tf_v2` provides common logic for importing the TF 2.0 API,
and returns the root module of the API if found, or else raises ImportError.
This is a function instead of a direct alias like `tf` in order to provide
enough indirection to get around circular dependencies.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

# First, check if using TF is explicitly disabled by request.
USING_TF = True
try:
  from tensorboard.compat import notf
  USING_TF = False
except ImportError:
  pass

# If TF is not disabled, check if it's available.
if USING_TF:
  try:
    import tensorflow as tf
  except ImportError:
    USING_TF = False

if not USING_TF:
  # If we can't use TF, try to provide the stub instead.
  # This will only work if the tensorflow_stub dep is included
  # in the build, via the `tensorboard/compat:tensorflow` target.
  try:
    from tensorboard.compat import tensorflow_stub as tf
  except ImportError:
    pass


def import_tf_v2():
  """Import the TF 2.0 API if possible, or raise an ImportError."""
  # We must be able to use TF in order to provide the TF 2.0 API.
  if USING_TF:
    # Check if this is TF 2.0 by looking for a known 2.0-only tf.summary symbol.
    # TODO(nickfelt): determine a cleaner way to do this.
    # DO NOT SUBMIT - replicate to GitHub
    if hasattr(tf, 'summary') and hasattr(tf.summary, 'write'):
      return tf
    else:
      # As a fallback, try `tensorflow.compat.v2` if it's defined.
      if hasattr(tf, 'compat') and hasattr(tf.compat, 'v2'):
        return tf.compat.v2
  raise ImportError('cannot import tensorflow 2.0 API')
