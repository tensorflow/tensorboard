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
"""TensorFlow component package for providing tf.summary from TensorBoard."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

# Re-export all symbols from the original tf.summary.
# pylint: disable=wildcard-import,unused-import,g-import-not-at-top
if tf.__version__.startswith('2.'):
  from tensorflow.summary import *
else:
  from tensorflow.compat.v2.summary import *

from tensorboard.summary.v2 import audio
from tensorboard.summary.v2 import histogram
from tensorboard.summary.v2 import image
from tensorboard.summary.v2 import scalar
from tensorboard.summary.v2 import text

del absolute_import, division, print_function, tf
