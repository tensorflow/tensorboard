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

"""Compatibility interfaces for TensorBoard."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

USING_TF = True

# Don't attempt to use TF at all if this import exists due to build rules.
try:
  from tensorboard.compat import notf
  USING_TF = False
except ImportError:
  pass

if USING_TF:
  try:
    import tensorflow as tf
  except ImportError:
    USING_TF = False

if not USING_TF:
  from tensorboard.compat import tensorflow_stub as tf
