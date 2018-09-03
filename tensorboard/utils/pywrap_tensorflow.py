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
# =============================================================================
"""A wrapper for TensorFlow SWIG-generated bindings."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


TFE_DEVICE_PLACEMENT_WARN = 0
TFE_DEVICE_PLACEMENT_SILENT_FOR_INT32 = 0
TFE_DEVICE_PLACEMENT_SILENT = 0
TFE_DEVICE_PLACEMENT_EXPLICIT = 0


def __getattr__(attr):
    return 0


def TF_bfloat16_type():
    return 0
