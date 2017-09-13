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

from google.cloud import spanner

import contextlib
import datetime
import functools

import os

from tensorboard import db
from tensorboard import spanner as tb_spanner
from tensorboard import loader
from tensorboard import loader_test
import tensorflow as tf
import tempfile
import unittest

CODE_ALREADY_EXISTS = 409

class SchemaToSpannerDDL(tf.test.TestCase):
  def testSchemas(self):
    table = tb_spanner.TableSchema(
      name = 'SomeTable',
      columns=[tb_spanner.ColumnSchema('k_int64', tb_spanner.Int64ColumnType()),
               tb_spanner.ColumnSchema('k_str', tb_spanner.StringColumnType(length=23)),
               tb_spanner.ColumnSchema('str_max', tb_spanner.StringColumnType())],
      keys=['k_int64', 'k_str'])

    ddl = tb_spanner.schema_to_spanner_ddl(table)
    expected = ('CREATE TABLE SomeTable ('
                'k_int64 INT64, k_str STRING(23), str_max STRING(MAX))'
                ' PRIMARY KEY (k_int64, k_str)')
    self.assertEqual(expected, ddl)

class SqlParserTest(tf.test.TestCase):
  def testParseInsert(self):
    sql = ('INSERT INTO EventLogs (rowid, customer_number, run_id, event_log_id, path, offset)'
           ' VALUES (?, ?, ?, 0)')
    parameters = ('a', 'b', 'c')

    insert_sql = tb_spanner.parse_sql(sql, parameters)
    self.assertIsInstance(insert_sql, tb_spanner.InsertSQL)
    self.assertEquals('EventLogs', insert_sql.table)
    self.assertAllEqual(['rowid', 'customer_number', 'run_id', 'event_log_id', 'path', 'offset'],
                        insert_sql.columns)
    self.assertAllEqual(['a', 'b', 'c', 0], insert_sql.values)

  def testParseSelect(self):
    sql = ('SELECT rowid, offset FROM EventLogs WHERE run_id = ? AND path = ?')
    parameters = ('a', 'b')

    select_sql = tb_spanner.parse_sql(sql, parameters)
    self.assertIsInstance(select_sql, tb_spanner.SelectSQL)
    self.assertEquals('SELECT rowid, offset FROM EventLogs WHERE run_id = a AND path = b',
                      select_sql.sql)

class CloudSpannerCursorTest(tf.test.TestCase):
  @classmethod
  def setUpClass(self):
    # Use an existing database
    # TODO(jlewi): Create the Spanner instance and database as part of onetime setup for all tests.
    project = "cloud-ml-dev"
    instance_name = "jlewi-tb"
    # database_name = "tb-test-20170911-185126"
    # Use a unique DB on each test run.
    now = datetime.datetime.now()
    database_name = "tb-test-{0}".format(now.strftime("%Y%m%d-%H%M%S"))
    self.conn = tb_spanner.CloudSpannerConnection(project, instance_name, database_name)
    schema = tb_spanner.CloudSpannerSchema(self.conn)
    schema.create_tables()

  def testInsertSql(self):
    """Test that insert SQL statements work."""
    schema = tb_spanner.CloudSpannerSchema(self.conn)

    # Insert a row into EventLogs
    now = datetime.datetime.now()
    rowid = int(now.strftime("%Y%m%d%H%M%S"))
    run_id = rowid
    event_log_id = rowid
    path = "some_path_{0}".format(rowid)
    customer_number = 10
    offset = 23
    with contextlib.closing(self.conn.cursor()) as c:
      c.execute(
            ('INSERT INTO EventLogs (rowid, customer_number, run_id, event_log_id, path, offset)'
               ' VALUES (?, ?, ?, ?, ?, ?)'),
              (rowid, customer_number, run_id, event_log_id, path, offset))


    with self.conn.database.snapshot() as snapshot:
      # TODO(jlewi): Verify that we can read the row.
      keyset = spanner.KeySet([[rowid, customer_number, run_id, event_log_id]])

      results = snapshot.read(
        table='EventLogs',
          columns=('rowid', 'customer_number', 'run_id', 'event_log_id', 'path', 'offset',),
          keyset=keyset,)

      rows = []
      for row in results:
        rows.append(row)

      self.assertEquals(1, len(rows))
      self.assertAllEqual([rowid, customer_number, run_id, event_log_id, path, offset], rows[0])


  def testSelectSql(self):
    """Test verifies we can issue select queries against Cloud Spanner."""
    rows = [
      [297, 0 , 0,  0, 'path_0', 0],
      [297, 0 , 0,  1, 'path_1', 1],
      [392, 0 , 1,  0, 'path_0', 0],
      [392, 0 , 1,  1, 'path_1', 1],
    ]

    with self.conn.database.batch() as batch:
      batch.insert(
        table='EventLogs',
        columns=['rowid','customer_number', 'run_id', 'event_log_id', 'path', 'offset'],
        values = rows)

    with contextlib.closing(self.conn.cursor()) as c:
      c.execute(
            ('SELECT rowid, customer_number, run_id, event_log_id, path, offset '
               ' from EventLogs where rowid = ? and event_log_id = ?'),
              (297, 0))
      row = c.fetchone()
      self.assertAllEqual([297, 0 , 0,  0, 'path_0', 0], row)

      # According to PEP 249 fetchone should return None if no more rows.
      self.assertIsNone(c.fetchone())

if __name__ == "__main__":
  tf.test.main()