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

"""TensorBoard core database schema.

Currently the only database supported is SQLite.

Warning: This module is EXPERIMENTAL. It will not be considered stable
until data migration tools are put into place. Until that time, any
database created with this schema will need to be deleted as new
updates occur.

## Index Behavior

All primary keys and indexes SHOULD contain a randomly generated UUID
string to get good sharding in distributed systems. Monotonic indexes
SHOULD be avoided whenever possible.

All user-facing queries MUST operate on indexed fields.

## Foreign Key Behavior

Plugins MAY reference the id field of any table, in their own tables.
When rows in the core table are deleted, orphaned rows in other tables
will not be deleted. Plugins SHOULD treat orphaned rows as if they had
been deleted. It is RECOMMENDED that plugins implement a routine that
runs periodically to clean up orphaned rows. It is RECOMMENDED that
plugins not rely on database-specific techniques, such as delete
cascading, to accomplish this.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib


def setup_database(db_conn):
  """Creates SQL tables and indexes needed by TensorBoard.

  If the tables and indexes are already created, this function has no
  effect. Commit is called on the connection object when this function
  is complete.

  Args:
    db_conn: A PEP 249 Connection object.
  """
  create_runs_table(db_conn)
  create_event_logs_table(db_conn)
  db_conn.commit()


def create_runs_table(db_conn):
  """Creates the runs table.

  This table stores information about runs. Each row usually represents
  a single attempt at training or testing a TensorFlow model, with a
  given set of hyper-parameters, whose summaries are written out to a
  single event logs directory with a monotonic step counter.

  When a run is deleted from this table, TensorBoard SHOULD treat all
  information associated with it as deleted, even if those rows in
  different tables still exist.

  Fields:
    id: (Primary key) Arbitrary string created using uuid.uuid4(). This
        value SHOULD NOT be displayed in the TensorBoard UI.
    name: (Uniquely indexed) Arbitrary string which is displayed to
        the user in the TensorBoard UI.
  """
  with contextlib.closing(db_conn.cursor()) as c:
    c.execute('''\
      CREATE TABLE IF NOT EXISTS runs (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL
      )
    ''')
    c.execute('''\
      CREATE UNIQUE INDEX IF NOT EXISTS runs_index
      ON runs (name)
    ''')


def create_event_logs_table(db_conn):
  """Creates the event_logs table.

  Event logs are files written to disk by TensorFlow via FileWriter,
  which uses PyRecordWriter to output records containing binary-encoded
  tf.Event protocol buffers.

  This table is used by FileLoader to track the progress of files being
  loaded off disk into the database. The primary key for this table is
  (run_id, path).

  Each time FileLoader runs a transaction committing events to the
  database, it updates the offset field.

  Fields:
    run_id: A reference to the id field of the associated row in the
        runs table.
    path: The basename of the path of the event log file. It SHOULD be
        formatted: events.out.tfevents.UNIX_TIMESTAMP.HOSTNAME[SUFFIX].
    offset: The byte offset in the event log file *after* the last
        successfully committed event record.
  """
  with contextlib.closing(db_conn.cursor()) as c:
    c.execute('''\
      CREATE TABLE IF NOT EXISTS event_logs (
        run_id VARCHAR(36) NOT NULL,
        path VARCHAR(255) NOT NULL,
        offset INTEGER NOT NULL
      )
    ''')
    c.execute('''\
      CREATE UNIQUE INDEX IF NOT EXISTS event_logs_index
      ON event_logs (run_id, path)
    ''')
