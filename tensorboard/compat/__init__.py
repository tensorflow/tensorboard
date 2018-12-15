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

This module provides aliases for importing variations on the TensorFlow APIs.

`from tensorboard.compat import tf`: this provides the TF API. By default
this will try to `import tensorflow` and if it fails, will be undefined. This
is useful primarily when also depending on //tensorboard/compat:tensorflow.

`from tensorboard.compat import tf_v2`: this provides the TF 2.0 API. By
default this tries to import the TF 2.0 API from a few places where it may
be accessible, and if it fails, will be undefined.
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

if USING_TF:
  # If we can use TF, try to provide `tf_v2` as well.
  # Check if this is TF 2.0 by looking for a known 2.0-only tf.summary symbol.
  # TODO(nickfelt): determine a cleaner way to do this.
  if hasattr(tf.summary, 'write'):
    tf_v2 = tf
  else:
    # As a fallback, try `tensorflow.compat.v2` if it's defined.
    try:
      from tensorflow.compat import v2 as tf_v2
    except ImportError:
      pass
else:
  # If we can't use TF, try to provide the stub instead.
  # This will only work if the tensorflow_stub dep is included
  # in the build, via the `tensorboard/compat:tensorflow` target.
  try:
    from tensorboard.compat import tensorflow_stub as tf
  except ImportError:
    pass
