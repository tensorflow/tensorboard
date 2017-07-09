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

WARNING: This module is EXPERIMENTAL. It will not be considered stable
until data migration tools are put into place. Until that time, any
database created with this schema will need to be deleted as new updates
occur.

## Overview

TensorBoard stores data using SQL via the PEP 249 API. We accomplish
portability by restricting ourselves to an understanding of SQL that
works efficiently in both the tiniest database in the world, SQLite, as
well as the largest database in the world, Spanner. This, in theory,
should mean all other ACID SQL DBs in-between are supported as well.

## Primary Keys

Every table has a primary key. This is considered a SQL best practice
and is mandated by Spanner[1].

Primary keys are randomly generated because it scales better than auto
incremented IDs. Monotonic indexes in distributed systems like Spanner
tend to cause all operations to go to a single node[2].

Primary keys are 63-bit integers. They act not only as indexes, but also
control where the row data is stored. We are constrained to this data
type because SQLite will only make a field the "rowid"[3] if it's
declared "INTEGER PRIMARY KEY" and SQLite doesn't support unsigned
integers. Please note that INTEGER is 32-bits in MySQL and PostgreSQL.

To control the locality of rows, a multi-field key will be encoded into
the 63-bits. When this happens, the higher and lower bits will be random
and the middle bits will encode the second field, e.g. timestamp for a
time-series chart. This ensures rows occupy contiguous memory in
SQLite's B-trees, thus minimizing disk seeks; and in distributed systems
ensures rows a stored on ideally one shard, thus minimizing RPCs. The
high random bits ensure locality when the sharding algorithm is the
less-than operator and the low random bits hedge against modulus
sharding.

## Foreign Keys

There is no referential integrity on foreign keys. When we delete a row,
we do not delete the rows that reference it. Foreign key cleanup
performed manually on a periodic basis. This is because Spanner and
SQLite do not have delete cascading. Furthermore, TensorBoard core has
no awareness of tables defined by plugins, which might reference these
tables.

## Transactions

All database writes happen inside transactions.

Transactions are optimistic in the sense that they assume, when
inserting data, that the randomly generated ID range has never been
inserted before. While collisions in a 64-bit address space are
unlikely, even with imperfect PRNG, we retry transactions with new
random IDs in the event that they do occur.

All transactions are retried upon failure with exponential back-off, to
handle transient failures. These can occur in any database for a variety
of reasons, such as write contention. For example SQLite does not
acquire a write lock when a transaction begins, but rather, when the
first write happens[4].

[1] https://goo.gl/HxSCo4
[2] https://cloud.google.com/spanner/docs/schema-design
[3] https://sqlite.org/lang_createtable.html#rowid
[4] https://sqlite.org/lang_transaction.html
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import sqlite3  # pylint: disable=unused-import


def setup_database(db_conn):
  """Creates SQL tables and indexes needed by TensorBoard.

  If the tables and indexes are already created, this function has no
  effect.

  Args:
    db_conn: A PEP 249 Connection object.

  :type db_conn: sqlite3.Connection
  """
  create_runs_table(db_conn)
  create_event_logs_table(db_conn)


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
    id: Random integer primary key in range [0,2^63).
    name: (Uniquely indexed) Arbitrary string which is displayed to
        the user in the TensorBoard UI.

  :type db_conn: sqlite3.Connection
  """
  with contextlib.closing(db_conn.cursor()) as c:
    c.execute('''\
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY,
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
  loaded off disk into the database.

  Each time FileLoader runs a transaction committing events to the
  database, it updates the offset field.

  Fields:
    id: Random integer primary key in range [0,2^63).
    run_id: A reference to the id field of the associated row in the
        runs table.
    path: The basename of the path of the event log file. It SHOULD be
        formatted: events.out.tfevents.UNIX_TIMESTAMP.HOSTNAME[SUFFIX].
    offset: The byte offset in the event log file *after* the last
        successfully committed event record.

  :type db_conn: sqlite3.Connection
  """
  with contextlib.closing(db_conn.cursor()) as c:
    c.execute('''\
      CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY,
        run_id INTEGER NOT NULL,
        path VARCHAR(255) NOT NULL,
        offset INTEGER NOT NULL
      )
    ''')
    c.execute('''\
      CREATE UNIQUE INDEX IF NOT EXISTS event_logs_index
      ON event_logs (run_id, path)
    ''')
