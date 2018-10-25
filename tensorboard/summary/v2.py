# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""[EXPERIMENTAL] Central API entry point for v2 versions of summary operations.

This module exposes v2 summary ops for the standard TensorBoard plugins.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.plugins.scalar.summary import scalar
from tensorboard.plugins.scalar.summary import scalar_pb

def _not_implemented_yet():
  raise NotImplementedError()

audio = _not_implemented_yet
audio_pb = _not_implemented_yet

custom_scalar = _not_implemented_yet
custom_scalar_pb = _not_implemented_yet

histogram = _not_implemented_yet
histogram_pb = _not_implemented_yet

image = _not_implemented_yet
image_pb = _not_implemented_yet

pr_curve = _not_implemented_yet
pr_curve_pb = _not_implemented_yet
pr_curve_streaming_op = _not_implemented_yet
pr_curve_raw_data_op = _not_implemented_yet
pr_curve_raw_data_pb = _not_implemented_yet

text = _not_implemented_yet
text_pb = _not_implemented_yet
