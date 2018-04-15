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
"""Utility methods for dealing with protocol buffer messages defined in
metadata.proto.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

def param_value_from_proto(param_value_proto):
  """Returns the param value field set in the ParamValue proto.

  Returns 'None' if no value is set
  """
  oneof_field_name = param_value_proto.WhichOneof("value")
  if oneof_field_name is None:
    return None
  return getattr(param_value_proto, oneof_field_name)
