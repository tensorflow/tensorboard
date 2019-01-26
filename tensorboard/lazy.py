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
# ==============================================================================
"""TensorBoard is a webapp for understanding TensorFlow runs and graphs.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import functools
import types


class LazyLoader(types.ModuleType):
  """Lazily import a module.

  This can be used to defer importing troublesome dependencies - e.g. ones that
  are large and infrequently used, or that cause a dependency cycle -
  until they are actually used.
  """

  # The lint error here is incorrect.
  def __init__(self, name, load_fn):  # pylint: disable=super-on-old-class
    """Create a LazyLoader for a module.

    Args:
      name: the fully-qualified name of the module
      load_fn: callable that actually does the import and returns the module
    """
    super(LazyLoader, self).__init__(name)
    self._load_fn = load_fn
    self._cached_module = None

  def _load(self):
    self._cached_module = self._load_fn()
    # Update this object's dict to make future lookups efficient (__getattr__ is
    # only called on lookups that fail).
    self.__dict__.update(self._cached_module.__dict__)

  def __getattr__(self, item):
    if not self._cached_module:
      self._load()
    return getattr(self._cached_module, item)

  def __dir__(self):
    if not self._cached_module:
      self._load()
    return dir(self._cached_module)


def lazy_load(name):
  """Decorator to define a function that lazily loads the module 'name'.

  Args:
    name: the fully-qualified name of the module; typically the last segment
      of 'name' matches the name of the decorated function

  Returns:
    Decorator function for lazily loading the module 'name'.
  """
  return functools.partial(LazyLoader, name)
