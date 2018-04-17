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
"""Common utils for all inference plugin files."""


class InvalidUserInputError(Exception):
  """An exception to throw if user input is detected to be invalid.

  Attributes:
    original_exception: The triggering `Exception` object to be wrapped, or
      a string.
  """

  def __init__(self, original_exception):
    """Inits InvalidUserInputError."""
    self.original_exception = original_exception
    Exception.__init__(self)

  @property
  def message(self):
    return 'InvalidUserInputError: ' + str(self.original_exception)
