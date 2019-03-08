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
"""Unit tests for the `tensorboard.lazy` module."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six
import unittest

from tensorboard import lazy


class LazyTest(unittest.TestCase):

  def test_self_composition(self):
    """A lazy module should be able to load another lazy module."""
    # This test can fail if the `LazyModule` implementation stores the
    # cached module as a field on the module itself rather than a
    # closure value. (See pull request review comments on #1781 for
    # details.)

    @lazy.lazy_load("inner")
    def inner():
      import collections  # pylint: disable=g-import-not-at-top
      return collections

    @lazy.lazy_load("outer")
    def outer():
      return inner

    x1 = outer.namedtuple
    x2 = inner.namedtuple
    self.assertEqual(x1, x2)

  def test_lazy_cycle(self):
    """A cycle among lazy modules should error, not deadlock or spin."""
    # This test can fail if `_memoize` uses a non-reentrant lock. (See
    # pull request review comments on #1781 for details.)

    @lazy.lazy_load("inner")
    def inner():
      return outer.foo

    @lazy.lazy_load("outer")
    def outer():
      return inner

    expected_message = "Circular import when resolving LazyModule 'inner'"
    with six.assertRaisesRegex(self, ImportError, expected_message):
      outer.bar

  def test_repr_before_load(self):
    @lazy.lazy_load("foo")
    def foo():
      self.fail("Should not need to resolve this module.")
    self.assertEquals(repr(foo), "<module 'foo' via LazyModule (not yet loaded)>")

  def test_repr_after_load(self):
    import collections  # pylint: disable=g-import-not-at-top
    @lazy.lazy_load("foo")
    def foo():
      return collections
    foo.namedtuple
    self.assertEquals(repr(foo), "<%r via LazyModule (loaded)>" % collections)

  def test_failed_load_idempotent(self):
    expected_message = "you will never stop me"
    @lazy.lazy_load("bad")
    def bad():
      raise ValueError(expected_message)
    with six.assertRaisesRegex(self, ValueError, expected_message):
      bad.day
    with six.assertRaisesRegex(self, ValueError, expected_message):
      bad.day

  def test_loads_only_once_even_when_result_equal_to_everything(self):
    # This would fail if the implementation of `_memoize` used `==`
    # rather than `is` to check for the sentinel value.
    class EqualToEverything(object):
      def __eq__(self, other):
        return True

    count_box = [0]
    @lazy.lazy_load("foo")
    def foo():
      count_box[0] += 1
      return EqualToEverything()

    dir(foo)
    dir(foo)
    self.assertEqual(count_box[0], 1)


if __name__ == '__main__':
  unittest.main()
