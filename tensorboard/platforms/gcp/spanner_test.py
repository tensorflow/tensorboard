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

from tensorboard.platforms.gcp import spanner as tb_spanner
from tensorboard import schema
import tensorflow as tf


class SchemaToSpannerDDL(tf.test.TestCase):
  def testSchemas(self):
    table = schema.TableSchema(
        name='SomeTable',
        columns=[schema.ColumnSchema('k_int64', schema.Int64ColumnType()),
                 schema.ColumnSchema(
                     'k_str', schema.StringColumnType(length=23)),
                 schema.ColumnSchema('str_max', schema.StringColumnType())],
        keys=['k_int64', 'k_str'])

    ddl = tb_spanner.to_spanner_ddl(table)
    expected = ('CREATE TABLE SomeTable ('
                'k_int64 INT64, k_str STRING(23), str_max STRING(MAX))'
                ' PRIMARY KEY (k_int64, k_str)')
    self.assertEqual(expected, ddl)

  def testIndexSchemaToDdl(self):
    # Test to make sure we can generate valid DDL statements.
    expected = ('CREATE UNIQUE INDEX ExperimentsNameIndex '
                'ON Experiments (customer_number, name)')
    actual = tb_spanner.to_spanner_ddl(schema.EXPERIMENTS_NAME_INDEX)
    self.assertEqual(expected, actual)


class SqlParserTest(tf.test.TestCase):
  def testParseInsert(self):
    sql = ('INSERT INTO EventLogs (rowid, customer_number, run_id, '
           'event_log_id, path, offset) VALUES (?, ?, ?, 0)')
    parameters = ('a', 'b', 'c')

    insert_sql = tb_spanner.parse_sql(sql, parameters)
    self.assertIsInstance(insert_sql, tb_spanner.InsertSQL)
    self.assertEquals('EventLogs', insert_sql.table)
    self.assertAllEqual(['rowid', 'customer_number', 'run_id', 'event_log_id',
                         'path', 'offset'], insert_sql.columns)
    self.assertAllEqual(['a', 'b', 'c', 0], insert_sql.values)

  def testParseSelect(self):
    sql = ('SELECT rowid, offset FROM EventLogs WHERE run_id = ? AND path = ?')
    parameters = ('a', 'b')

    select_sql = tb_spanner.parse_sql(sql, parameters)
    self.assertIsInstance(select_sql, tb_spanner.SelectSQL)
    self.assertEquals('SELECT rowid, offset FROM EventLogs WHERE '
                      'run_id = a AND path = b', select_sql.sql)
    self.assertEquals('EventLogs', select_sql.table)
    self.assertAllEqual(['rowid', 'offset'], select_sql.columns)


if __name__ == "__main__":
  tf.test.main()
