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

class SqlParserTest(tf.test.TestCase):
  def testParseInsert(self):
    sql = ('INSERT INTO EventLogs (rowid, customer_number, run_id, '
           'event_log_id, path, offset) VALUES (?, ?, ?, 0)')
    parameters = ('a', 10, 'c')

    insert_sql = tb_spanner.parse_sql(sql, parameters)
    self.assertIsInstance(insert_sql, tb_spanner.InsertSQL)
    self.assertEqual('EventLogs', insert_sql.table)
    self.assertAllEqual(['rowid', 'customer_number', 'run_id', 'event_log_id',
                         'path', 'offset'], insert_sql.columns)
    self.assertAllEqual(['"a"', 10, '"c"', 0], insert_sql.values)

  def testParseSelect(self):
    sql = ('SELECT rowid, offset FROM EventLogs WHERE run_id = ? AND path = ?')
    parameters = (5, 'b')

    select_sql = tb_spanner.parse_sql(sql, parameters)
    self.assertIsInstance(select_sql, tb_spanner.SelectSQL)
    self.assertEqual('SELECT rowid, offset FROM EventLogs WHERE '
                     'run_id = 5 AND path = "b"', select_sql.sql)
    self.assertEqual('EventLogs', select_sql.table)
    self.assertAllEqual(['rowid', 'offset'], select_sql.columns)


if __name__ == "__main__":
  tf.test.main()
