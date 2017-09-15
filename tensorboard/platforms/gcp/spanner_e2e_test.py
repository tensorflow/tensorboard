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
"""E2E test for Cloud Spanner support classes.

This test requires access to GCP.
"""

import contextlib
import datetime

from google.cloud import spanner  # pylint: disable=import-error

from tensorboard.platforms.gcp import spanner as tb_spanner
import tensorflow as tf


class CloudSpannerCursorTest(tf.test.TestCase):
  @classmethod
  def setUpClass(cls):
    # Use an existing database
    # TODO(jlewi): Should we make this a command line argument?
    project = "cloud-ml-dev"
    instance_name = "jlewi-tb"
    # Use a unique DB on each test run.
    now = datetime.datetime.now()
    database_name = "tb-test-{0}".format(now.strftime("%Y%m%d-%H%M%S"))
    cls.conn = tb_spanner.CloudSpannerConnection(
        project, instance_name, database_name)
    tb_spanner.create_database(cls.conn.client, instance_name, database_name)

  def testInsertSql(self):
    """Test that insert SQL statements work."""

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
          ('INSERT INTO EventLogs (rowid, customer_number, run_id, '
           'event_log_id, path, offset) VALUES (?, ?, ?, ?, ?, ?)'),
          (rowid, customer_number, run_id, event_log_id, path, offset))

    with self.conn.database.snapshot() as snapshot:
      # Verify that we can read the row.
      keyset = spanner.KeySet([[rowid, customer_number, run_id, event_log_id]])

      results = snapshot.read(
          table='EventLogs',
          columns=('rowid', 'customer_number', 'run_id',
                   'event_log_id', 'path', 'offset',),
          keyset=keyset,)

      rows = []
      for row in results:
        rows.append(row)

      self.assertEquals(1, len(rows))
      self.assertAllEqual([rowid, customer_number, run_id,
                           event_log_id, path, offset], rows[0])

  def testSelectSql(self):
    """Test verifies we can issue select queries against Cloud Spanner."""
    rows = [
        [297, 0, 0, 0, 'path_0', 0],
        [297, 0, 0, 1, 'path_1', 1],
        [392, 0, 1, 0, 'path_0', 0],
        [392, 0, 1, 1, 'path_1', 1],
    ]

    with self.conn.database.batch() as batch:
      batch.insert(
          table='EventLogs',
          columns=['rowid', 'customer_number',
                   'run_id', 'event_log_id', 'path', 'offset'],
          values=rows)

    with contextlib.closing(self.conn.cursor()) as c:
      c.execute(
          ('SELECT rowid, customer_number, run_id, event_log_id, path, offset '
           ' from EventLogs where rowid = ? and event_log_id = ?'),
          (297, 0))
      row = c.fetchone()
      self.assertAllEqual([297, 0, 0, 0, 'path_0', 0], row)

      self.assertEqual(1, c.rowcount)
      # According to PEP 249 fetchone should return None if no more rows.
      self.assertIsNone(c.fetchone())

      # Check the descriptions.
      description = c.description
      names = [d[0] for d in description]
      self.assertAllEqual(['rowid', 'customer_number',
                           'run_id', 'event_log_id', 'path', 'offset'], names)

    # Test that a cursor is iterable.
    with contextlib.closing(self.conn.cursor()) as c:
      c.execute(
          ('SELECT rowid, customer_number, run_id, event_log_id, path, offset '
           ' from EventLogs where rowid = ?'),
          (392,))

      self.assertEqual(2, c.rowcount)

      results = []
      for row in c:  # pylint: disable=not-an-iterable
        results.append(row)

      self.assertAllEqual(rows[2], results[0])
      self.assertAllEqual(rows[3], results[1])


if __name__ == "__main__":
  tf.test.main()
