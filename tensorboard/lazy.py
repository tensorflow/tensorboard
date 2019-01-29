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
import threading
import types


def lazy_load(name):
  """Decorator to define a function that lazily loads the module 'name'.

  This can be used to defer importing troublesome dependencies - e.g. ones that
  are large and infrequently used, or that cause a dependency cycle -
  until they are actually used.

  Args:
    name: the fully-qualified name of the module; typically the last segment
      of 'name' matches the name of the decorated function

  Returns:
    Decorator function that produces a lazy-loading module 'name' backed by the
    underlying decorated function.
  """
  def wrapper(load_fn):
    # Wrap load_fn to call it exactly once and update __dict__ afterwards to
    # make future lookups efficient (only failed lookups call __getattr__).
    @_return_once
    def load_once(self):
      module = load_fn()
      self.__dict__.update(module.__dict__)
      return module

    # Define a module that proxies getattr() and dir() to the result of calling
    # load_once() the first time it's needed. The class is nested so we can close
    # over load_once() and avoid polluting the module's attrs with our own state.
    class LazyModule(types.ModuleType):
      def __getattr__(self, attr_name):
        return getattr(load_once(self), attr_name)

      def __dir__(self):
        return dir(load_once(self))

      def __repr__(self):
        return '<module \'%s\' (LazyModule)>' % self.__name__

    return LazyModule(name)
  return wrapper


def _return_once(f):
  """Decorator that calls f() once, then returns that value repeatedly."""
  not_called = object()  # Unique "not yet called" sentinel object.
  # Cache result indirectly via a list since closures can't reassign variables.
  cache = [not_called]
  lock = threading.Lock()
  @functools.wraps(f)
  def wrapper(*args, **kwargs):
    if cache[0] == not_called:
      with lock:
        if cache[0] == not_called:
          cache[0] = f(*args, **kwargs)
    return cache[0]
  return wrapper
