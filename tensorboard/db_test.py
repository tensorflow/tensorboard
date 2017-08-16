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

import tensorflow as tf

from tensorboard import db
from tensorboard import test_util


class PluginsTest(test_util.TestCase):

  def testGetPluginIds(self):
    self.assertEqual({'b': 1}, self.tbase.get_plugin_ids(['b']))
    self.assertEqual({'a': 2}, self.tbase.get_plugin_ids(['a']))
    self.assertEqual({'b': 1}, self.tbase.get_plugin_ids(['b']))
    self.assertEqual({'b': 1, 'c': 3}, self.tbase.get_plugin_ids(['c', 'b']))


class TransactionTest(test_util.TestCase):

  def setUp(self):
    super(TransactionTest, self).setUp()
    with contextlib.closing(self.connect_db()) as db_conn:
      with contextlib.closing(db_conn.cursor()) as c:
        c.execute('CREATE TABLE IF NOT EXISTS Numbers (a INTEGER, b INTEGER)')

  def testWritesNotVisibleUntilNextTransaction(self):

    def first(db_conn):
      db_conn.execute('INSERT INTO Numbers (a, b) VALUES (7, 23)')

    def second(db_conn):
      with contextlib.closing(db_conn.cursor()) as c:
        c.execute('SELECT b FROM Numbers WHERE a = 7')
        self.assertEqual(23, c.fetchone()[0])
        c.execute('UPDATE Numbers SET b = 24 WHERE a = 7')
      with contextlib.closing(db_conn.cursor()) as c:
        c.execute('SELECT b FROM Numbers WHERE a = 7')
        self.assertEqual(23, c.fetchone()[0])

    def third(db_conn):
      c = db_conn.execute('SELECT b FROM Numbers WHERE a = 7')
      self.assertEqual(24, c.fetchone()[0])

    self.tbase.run_transaction(first)
    self.tbase.run_transaction(second)
    self.tbase.run_transaction(third)

  def testWritesAreOrdered(self):

    def first(db_conn):
      db_conn.execute('INSERT INTO Numbers (a, b) VALUES (7, 23)')
      db_conn.execute('UPDATE Numbers SET b = 24 WHERE a = 7')
      db_conn.execute('UPDATE Numbers SET b = 25 WHERE a = 7')

    def second(db_conn):
      c = db_conn.execute('SELECT b FROM Numbers WHERE a = 7')
      self.assertEqual(25, c.fetchone()[0])

    self.tbase.run_transaction(first)
    self.tbase.run_transaction(second)

  def testRollback(self):

    def first(db_conn):
      db_conn.execute('INSERT INTO Numbers (a, b) VALUES (7, 23)')

    def second(db_conn):
      db_conn.execute('UPDATE Numbers SET b = 24 WHERE a = 7')
      raise Exception()

    def third(db_conn):
      c = db_conn.execute('SELECT b FROM Numbers WHERE a = 7')
      self.assertEqual(23, c.fetchone()[0])

    self.tbase.run_transaction(first)
    with self.assertRaises(Exception):
      self.tbase.run_transaction(second)
    self.tbase.run_transaction(third)

  def testTransactionalVacuum_isForbidden(self):
    with self.assertRaises(ValueError):
      self.tbase.run_transaction(lambda c: c.execute('vacuum'))


class IdTest(test_util.TestCase):

  def testPositiveBits(self):
    with self.assertRaises(ValueError):
      db.Id('i', 0)
    with self.assertRaises(ValueError):
      db.Id('i', -1)

  def testCheck(self):
    id2 = db.Id('foo_id', 2)
    with self.assertRaises(ValueError):
      id2.check(0)
    id2.check(1)
    id2.check(2)
    id2.check(3)
    with self.assertRaises(ValueError):
      id2.check(4)

  def testGenerate(self):
    # TODO(jart): Mock this out instead and test better.
    self.assertIn(db.Id('foo_id', 2).generate(), (1, 2, 3))

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
    for x, y in itertools.product(range(1, 3), range(1, 3)):
      self.assertEqual((x, y), r.parse(r.create(x, y)))

  def testGetRange(self):
    r = db.RowId('r', db.Id('x', 4), db.Id('y', 4))
    self.assertEqual((0x11, 0x1F), r.get_range(0x1))
    self.assertEqual((0xF1, 0xFF), r.get_range(0xF))

  def testOutOfBounds(self):
    r = db.RowId('r', db.Id('x', 2), db.Id('y', 2))
    with self.assertRaises(ValueError):
      r.create(4, 4)
    with self.assertRaises(ValueError):
      r.parse(8)
    with self.assertRaises(ValueError):
      r.get_range(4)


if __name__ == '__main__':
  tf.test.main()
