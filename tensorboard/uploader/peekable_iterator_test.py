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
"""Tests for tensorboard.uploader.peekable_iterator."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.uploader import peekable_iterator
from tensorboard import test as tb_test


class PeekableIteratorTest(tb_test.TestCase):
    """Tests for `PeekableIterator`."""

    def test_empty_iteration(self):
        it = peekable_iterator.PeekableIterator([])
        self.assertEqual(list(it), [])

    def test_normal_iteration(self):
        it = peekable_iterator.PeekableIterator([1, 2, 3])
        self.assertEqual(list(it), [1, 2, 3])

    def test_simple_peek(self):
        it = peekable_iterator.PeekableIterator([1, 2, 3])
        self.assertEqual(it.peek(), 1)
        self.assertEqual(it.peek(), 1)
        self.assertEqual(next(it), 1)
        self.assertEqual(it.peek(), 2)
        self.assertEqual(next(it), 2)
        self.assertEqual(next(it), 3)
        self.assertEqual(list(it), [])

    def test_simple_has_next(self):
        it = peekable_iterator.PeekableIterator([1, 2])
        self.assertTrue(it.has_next())
        self.assertEqual(it.peek(), 1)
        self.assertTrue(it.has_next())
        self.assertEqual(next(it), 1)
        self.assertEqual(it.peek(), 2)
        self.assertTrue(it.has_next())
        self.assertEqual(next(it), 2)
        self.assertFalse(it.has_next())
        self.assertFalse(it.has_next())

    def test_peek_after_end(self):
        it = peekable_iterator.PeekableIterator([1, 2, 3])
        self.assertEqual(list(it), [1, 2, 3])
        with self.assertRaises(StopIteration):
            it.peek()
        with self.assertRaises(StopIteration):
            it.peek()


if __name__ == "__main__":
    tb_test.main()
