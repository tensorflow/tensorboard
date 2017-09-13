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

def save_records(name, records):
  """Writes new record file to temp directory.

  :type name: str
  :type records: list[str]
  :rtype: str
  """
  temp_dir = tempfile.mkdtemp()
  path = os.path.join(temp_dir, name)
  with loader_test.RecordWriter(path) as writer:
    for record in records:
      writer.write(record)
  return path

# TODO(jlewi): This is an E2E test. Need to figure out proper way to run it and also
# to create unittests.
#class CloudSpannerTest(tf.test.TestCase):
#def testE2e(self):
def testE2e():
  project = "cloud-ml-dev"
  instance_name = "jlewi-tb"

  # Use a unique DB on each test run.
  now = datetime.datetime.now()
  database_name = "tb-test-{0}".format(now.strftime("%Y%m%d-%H%M%S"))

  client = spanner.Client(project)
  # TODO(jlewi): Should we specify parameters like region and nodes?
  config_name = "projects/{0}/instanceConfigs/regional-us-central1".format(project)
  instance = client.instance(instance_name, configuration_name=config_name,
                             node_count=3, display_name="Spanner instance for jlewi@.")
  try:
    op = instance.create()
    # TODO(jlewi): Wait for op to complete.
  except Exception as e:
    if e.code == CODE_ALREADY_EXISTS:
      # Do nothing since the instance already exists.
      pass
    else:
      raise e
    # e.get
  # TODO(jlewi): Wait for operation to complete.



  # DO NOT SUBMIT uncomment.
  # TODO(jlewi): create_tables is very slow; even for testing it might be an issue. I wonder if creating all tables
  # at once would speed things up?
  if False:
    conn = tb_spanner.CloudSpannerConnection(project, instance_name, database_name)
    schema = tb_spanner.CloudSpannerSchema(conn)
    schema.create_tables()
  else:
    # Use an existing database
    database_name = "tb-test-20170911-185126"
    conn = tb_spanner.CloudSpannerConnection(project, instance_name, database_name)
    schema = tb_spanner.CloudSpannerSchema(conn)

  # Insert a row into EventLogs
  rowid = int(now.strftime("%Y%m%d%H%M%S"))
  run_id = rowid
  event_log_id = rowid
  path = "some_path_{0}".format(rowid)
  customer_number = 10
  offset = 23
  with contextlib.closing(conn.cursor()) as c:
    c.execute(
          ('INSERT INTO EventLogs (rowid, customer_number, run_id, event_log_id, path, offset)'
             ' VALUES (?, ?, ?, ?, ?, 0)'),
            (rowid, customer_number, run_id, event_log_id, path))

    #c.execute(
        #'SELECT rowid, offset FROM EventLogs WHERE run_id = ? AND path = ?',
        #(self.run_id, log.path))
    #row = c.fetchone()
    #if row:
      #log.rowid = row[0]
      #log.set_offset(row[1])
    #else:
      #event_log_id = db.EVENT_LOG_ID.generate()
      #log.rowid = db.EVENT_LOG_ROWID.create(self.run_id, event_log_id)
      #c.execute(
          #('INSERT INTO EventLogs (rowid, run_id, path, offset)'
           #' VALUES (?, ?, ?, 0)'),
          #(log.rowid, self.run_id, log.path))

  #event = tf.Event(step=123)
  #path = save_records('events.out.tfevents.0.localhost', [event.SerializeToString()])

  ## Reading the EventLog doesn't actual try to write to the DB.
  #EventLog = functools.partial(loader.EventLogReader,
                               #record_reader_factory=loader.RecordReader)
  #with EventLog(path) as log:
    ##actual = log.get_next_event()
    ##self.assertEqual(event, log.get_next_event())
    ##self.assertIsNone(log.get_next_event())
    #customer_number = 1
    #experiment_id = 2
    #run_id = 3
    #name = "some run"
    #reader = loader.RunReader(customer_number, experiment_id, run_id, name)
    #reader.add_event_log(conn, log)


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

class CloudSpannerCursorTest(tf.test.TestCase):
  def testInsertSql(self):
    """Test that insert SQL statements work."""
    # TODO(jlewi): Create the Spanner instance and database as part of onetime setup for all tests.

    # Use an existing database
    project = "cloud-ml-dev"
    instance_name = "jlewi-tb"
    database_name = "tb-test-20170911-185126"
    conn = tb_spanner.CloudSpannerConnection(project, instance_name, database_name)
    schema = tb_spanner.CloudSpannerSchema(conn)

    # Insert a row into EventLogs
    now = datetime.datetime.now()
    rowid = int(now.strftime("%Y%m%d%H%M%S"))
    run_id = rowid
    event_log_id = rowid
    path = "some_path_{0}".format(rowid)
    customer_number = 10
    offset = 23
    with contextlib.closing(conn.cursor()) as c:
      c.execute(
            ('INSERT INTO EventLogs (rowid, customer_number, run_id, event_log_id, path, offset)'
               ' VALUES (?, ?, ?, ?, ?, ?)'),
              (rowid, customer_number, run_id, event_log_id, path, offset))


    with conn.database.snapshot() as snapshot:
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
if __name__ == "__main__":
  # DO NOT SUBMIT. Running the unittest interferes with how wingide breaks
  # on exceptions. What if we do run tests.
  tf.test.main()
  #testE2e()