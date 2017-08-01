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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import itertools
import os
import sqlite3

import tensorflow as tf

from tensorboard import db
from tensorboard import test_util


class DbTestCase(test_util.TestCase):

  def __init__(self, *args, **kwargs):
    super(DbTestCase, self).__init__(*args, **kwargs)
    self._db_connection_provider = None

  def setUp(self):
    super(DbTestCase, self).setUp()
    db_path = os.path.join(self.get_temp_dir(), 'DbTestCase.sqlite')
    self._db_connection_provider = lambda: sqlite3.connect(db_path)
    with contextlib.closing(self._db_connection_provider()) as conn:
      with conn:
        schema = db.Schema(conn)
        schema.create_tables()
        schema.create_indexes()


class PluginTest(DbTestCase):

  def testGetPluginIds(self):
    tbase = db.TensorBase(self._db_connection_provider)
    self.assertEqual({'b': 1}, tbase.get_plugin_ids(['b']))
    self.assertEqual({'a': 2}, tbase.get_plugin_ids(['a']))
    self.assertEqual({'b': 1}, tbase.get_plugin_ids(['b']))
    self.assertEqual({'b': 1, 'c': 3}, tbase.get_plugin_ids(['c', 'b']))


class IdTest(test_util.TestCase):

  def testPositiveBits(self):
    with self.assertRaises(ValueError):
      db.Id('i', 0)
    with self.assertRaises(ValueError):
      db.Id('i', -1)

  def testCheck(self):
    id1 = db.Id('foo_id', 1)
    with self.assertRaises(ValueError):
      id1.check(-1)
    id1.check(0)
    id1.check(1)
    with self.assertRaises(ValueError):
      id1.check(2)
    id2 = db.Id('foo_id', 2)
    id2.check(0)
    id2.check(3)
    with self.assertRaises(ValueError):
      id2.check(4)

  def testGenerate(self):
    # TODO(jart): Mock this out instead and test better.
    self.assertIn(db.Id('foo_id', 1).generate(), (0, 1))

  def testFields(self):
    id_ = db.Id('foo_id', 2)
    self.assertEqual('foo_id', id_.name)
    self.assertEqual(2, id_.bits)
    self.assertEqual(3, id_.max)


class RowIdTest(test_util.TestCase):

  def testTooManyBits(self):
    db.RowId('r', db.Id('g', 32), db.Id('l', 31))
    with self.assertRaises(ValueError):
      db.RowId('r', db.Id('g', 32), db.Id('l', 32))

  def testCreateAndParse(self):
    r = db.RowId('r', db.Id('g', 2), db.Id('l', 2))
    for x, y in itertools.product(range(3), range(3)):
      self.assertEqual((x, y), r.parse(r.create(x, y)))

  def testGetRange(self):
    r = db.RowId('r', db.Id('x', 4), db.Id('y', 4))
    self.assertEqual((0x00, 0x0F), r.get_range(0x0))
    self.assertEqual((0xF0, 0xFF), r.get_range(0xF))

  def testOutOfBounds(self):
    r = db.RowId('r', db.Id('x', 1), db.Id('y', 1))
    with self.assertRaises(ValueError):
      r.create(2, 2)
    with self.assertRaises(ValueError):
      r.parse(4)
    with self.assertRaises(ValueError):
      r.get_range(2)


if __name__ == '__main__':
  tf.test.main()
