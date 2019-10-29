# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import string

from tensorboard import test as tb_test
from tensorboard.backend import json_util

_INFINITY = float('inf')


class CleanseTest(tb_test.TestCase):

  def _assertWrapsAs(self, to_wrap, expected):
    """Asserts that |to_wrap| becomes |expected| when wrapped."""
    actual = json_util.Cleanse(to_wrap)
    for a, e in zip(actual, expected):
      self.assertEqual(e, a)

  def testWrapsPrimitives(self):
    self._assertWrapsAs(_INFINITY, 'Infinity')
    self._assertWrapsAs(-_INFINITY, '-Infinity')
    self._assertWrapsAs(float('nan'), 'NaN')

  def testWrapsObjectValues(self):
    self._assertWrapsAs({'x': _INFINITY}, {'x': 'Infinity'})

  def testWrapsObjectKeys(self):
    self._assertWrapsAs({_INFINITY: 'foo'}, {'Infinity': 'foo'})

  def testWrapsInListsAndTuples(self):
    self._assertWrapsAs([_INFINITY], ['Infinity'])
    # map() returns a list even if the argument is a tuple.
    self._assertWrapsAs((_INFINITY,), ['Infinity',])

  def testWrapsRecursively(self):
    self._assertWrapsAs({'x': [_INFINITY]}, {'x': ['Infinity']})

  def testOrderedDict_preservesOrder(self):
    # dict iteration order is not specified prior to Python 3.7, and is
    # observably different from insertion order in CPython 2.7.
    od = collections.OrderedDict()
    for c in string.ascii_lowercase:
      od[c] = c
    self.assertEqual(len(od), 26, od)
    self.assertEqual(list(od), list(json_util.Cleanse(od)))

  def testTuple_turnsIntoList(self):
    self.assertEqual(json_util.Cleanse(('a', 'b')), ['a', 'b'])

  def testSet_turnsIntoSortedList(self):
    self.assertEqual(json_util.Cleanse(set(['b', 'a'])), ['a', 'b'])

  def testByteString_turnsIntoUnicodeString(self):
    self.assertEqual(json_util.Cleanse(b'\xc2\xa3'), u'\u00a3')  # is # sterling


if __name__ == '__main__':
  tb_test.main()
