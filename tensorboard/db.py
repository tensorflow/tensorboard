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
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import functools
import random
import re
import sqlite3
import threading
import types  # pylint: disable=unused-import

from tensorboard import util

TESTING_MODE = False


class TensorBase(object):
  """API for TensorBase.

  This class is thread safe.
  """

  def __init__(self, db_connection_provider, retrier_factory=util.Retrier):
    """Creates new instance.

    :type db_connection_provider: () -> sqlite3.Connection
    :type retrier_factory: ((Exception) -> bool) -> util.Retrier
    """
    self._db_connection_provider = db_connection_provider
    self._plugin_ids_by_name = {}  # type: dict[str, int]
    self._plugin_ids_by_name_lock = threading.Lock()
    self._retrier = retrier_factory(_is_transient_sqlite_error)

  def run_transaction(self, callback):
    """Runs an optimistic database transaction.

    If the callback returns without throwing an exception, it is
    committed, otherwise it's rolled back. If the exception is a
    transient database error, such as write contention or a random ID
    INSERT failure, then we retry with exponential back-off.

    :type callback: (TransactionConnection) -> T
    :rtype: T
    """
    with contextlib.closing(self._db_connection_provider()) as connection:
      return self._retrier.run(_TransactionRunner(connection, callback))

  def get_plugin_ids(self, names):
    """Gets IDs of plugins, creating rows if they don't exist.

    This function maintains a cache of the plugins table in local
    memory, to avoid performing queries when possible. When writing to
    the table, this function is optimistic and can cause the outer
    transaction to abort, in which case it will need to be retried.

    Args:
      db_conn: A PEP 249 Connection object.
      names: An iterable of strings of plugin names.

    Returns:
      Map of plugin names to their permanent arbitrary IDs.

    :type names: list[str]
    :rtype: dict[str, int]
    """
    with self._plugin_ids_by_name_lock:
      if all(name in self._plugin_ids_by_name for name in names):
        return self._get_plugin_ids(names)
      self._plugin_ids_by_name.update(
          self.run_transaction(functools.partial(_add_plugins, names)))
      return self._get_plugin_ids(names)

  def _get_plugin_ids(self, names):
    return {name: self._plugin_ids_by_name[name] for name in names}


def _add_plugins(names, connection):
  """Fetches Plugins table and assigns IDs for new names if necessary.

  :type names: list[str]
  :type connection: TransactionConnection
  :rtype: dict[str, int]
  """
  the_whole_table = {}  # type: dict[str, int]
  names = set(names)
  max_id = 0
  for id_, name in connection.execute('SELECT plugin_id, name FROM Plugins'):
    if id_ > max_id:
      max_id = id_
    the_whole_table[name] = id_
    names.discard(name)
  new_rows = []
  for name in names:
    max_id += 1
    the_whole_table[name] = max_id
    new_rows.append((max_id, name))
  if new_rows:
    connection.executemany(
        'INSERT INTO Plugins (plugin_id, name) VALUES (?, ?)',
        new_rows)
  return the_whole_table


class Schema(object):
  """SQL schema creation tool for TensorBase."""

  def __init__(self, db_conn):
    """Creates new instance.

    :type db_conn: sqlite3.Connection
    """
    self._db_conn = db_conn

  def create_tables(self):
    """Creates SQL tables needed by TensorBoard.

    If the tables are already created, this function has no effect.

    Please note that the create_indexes() method should be called after
    this method. It might be advantageous in certain circumstances to
    hold off on calling that method, for example when loading a really
    large backup into a fresh database.
    """
    self.create_experiments_table()
    self.create_runs_table()
    self.create_tags_table()
    self.create_tensors_table()
    self.create_big_tensors_table()
    self.create_event_logs_table()
    self.create_plugins_table()

  def create_indexes(self):
    """Creates SQL tables and indexes needed by TensorBoard.

    If the indexes are already created, this function has no effect.
    """
    self.create_runs_table_id_index()
    self.create_runs_table_name_index()
    self.create_tags_table_id_index()
    self.create_tags_table_name_index()
    self.create_event_logs_table_path_index()
    self.create_plugins_table_name_index()

  def create_experiments_table(self):
    """Creates the Experiments table.

    This table stores information about experiments, which are sets of
    runs.

    Fields:
      experiment_id: Random integer primary key in range [0,2^28).
      name: (Uniquely indexed) Arbitrary string which is displayed to
          the user in the TensorBoard UI, which can be no greater than
          255 characters.
      description: Arbitrary markdown text describing the experiment.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Experiments (
          experiment_id INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL
        )
      ''')

  def create_runs_table(self):
    """Creates the Runs table.

    This table stores information about runs. Each row usually
    represents a single attempt at training or testing a TensorFlow
    model, with a given set of hyper-parameters, whose summaries are
    written out to a single event logs directory with a monotonic step
    counter.

    When a run is deleted from this table, TensorBoard SHOULD treat all
    information associated with it as deleted, even if those rows in
    different tables still exist.

    Fields:
      rowid: Row ID which has run_id in the low 29 bits and
          experiment_id in the higher 28 bits. This is used to control
          locality.
      experiment_id: The 28-bit experiment ID.
      run_id: Unique randomly generated 29-bit ID for this run.
      name: Arbitrary string which is displayed to the user in the
          TensorBoard UI, which is unique within a given experiment,
          which can be no greater than 1900 characters.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Runs (
          rowid INTEGER PRIMARY KEY,
          run_id INTEGER NOT NULL,
          experiment_id INTEGER NOT NULL,
          name VARCHAR(1900) NOT NULL
        )
      ''')

  def create_runs_table_id_index(self):
    """Uniquely indexes the run_id field on the Runs table."""
    with self._cursor() as c:
      c.execute('''\
        CREATE UNIQUE INDEX IF NOT EXISTS RunsIdIndex ON Runs (run_id)
      ''')

  def create_runs_table_name_index(self):
    """Uniquely indexes the name field on the Runs table.

    More accurately, this indexes (experiment_id, name).
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE UNIQUE INDEX IF NOT EXISTS RunsNameIndex
        ON Runs (experiment_id, name)
      ''')

  def create_tags_table(self):
    """Creates the Tags table.

    Fields:
      rowid: The rowid which has tag_id field in the low 31 bits and the
          experiment ID in the higher 28 bits.
      tag_id: Unique randomly distributed 31-bit ID for this tag.
      run_id: The id of the row in the runs table, with which this tag
          is associated.
      plugin_id: The ID of the related row in the Plugins table.
      name: The tag. See the tag field in summary.proto for more
          information, which can be no greater than 255 characters.
      display_name: Same as SummaryMetadata.display_name, if set, which
          can be no greater than 255 characters.
      summary_description: Same as SummaryMetadata.summary_description,
          if set. This is Markdown describing the summary.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Tags (
          rowid INTEGER PRIMARY KEY,
          tag_id INTEGER NOT NULL,
          run_id INTEGER NOT NULL,
          plugin_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255),
          summary_description TEXT
        )
      ''')

  def create_tags_table_id_index(self):
    """Indexes the tag_id field on the Tags table."""
    with self._cursor() as c:
      c.execute('''\
        CREATE UNIQUE INDEX IF NOT EXISTS TagsIdIndex ON Tags (tag_id)
      ''')

  def create_tags_table_name_index(self):
    """Indexes the name field on the Tags table."""
    with self._cursor() as c:
      c.execute('''\
        CREATE UNIQUE INDEX IF NOT EXISTS TagsNameIndex
        ON Tags (run_id, name)
      ''')

  def create_tensors_table(self):
    """Creates the Tensors table.

    This table is designed to offer contiguous in-page data storage.

    Fields:
      rowid: A 63-bit number containing the step count in the low 32
          bits, and the randomly generated tag ID in the higher 31 bits.
      encoding: A number indicating how the tensor was encoded to the
          tensor blob field. 0 indicates an uncompressed binary Tensor
          proto. 1..9 indicates a binary Tensor proto gzipped at the
          corresponding level. 10..255 are reserved for future encoding
          methods.
      is_big: A boolean indicating that the tensor field is empty and a
          separate asynchronous lookup should be performed on the
          BigTensors table.
      tensor: A binary representation of this tensor. This will be empty
          if the is_big field is true.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Tensors (
          rowid INTEGER PRIMARY KEY,
          encoding TINYINT NOT NULL,
          is_big BOOLEAN NOT NULL,
          tensor BLOB NOT NULL  -- TODO(@jart): VARBINARY on MySQL, MS-SQL, etc.
        )
      ''')

  def create_big_tensors_table(self):
    """Creates the BigTensors table.

    This table is meant for tensors larger than half a b-tree page.
    Please note that some databases, e.g. MySQL, will store these
    tensors off-page.

    Fields:
      rowid: Must be same as corresponding Tensors table row.
      tensor: A binary representation of this tensor, using the encoding
          specified in the corresponding Tensors table row.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS BigTensors (
          rowid INTEGER PRIMARY KEY,
          tensor BLOB NOT NULL
        )
      ''')

  def create_plugins_table(self):
    """Creates the Plugins table.

    This table exists to assign arbitrary IDs to TBPlugin names. These
    IDs are handed out in monotonically increasing order, but that's OK,
    because the size of this table will be extremely small. These IDs
    will not be the same across TensorBoard installs.

    It is assumed that once an ID is mapped to a name, that the mapping
    will never change.

    Fields:
      plugin_id: Arbitrary integer arbitrarily limited to 16-bits.
      name: Arbitrary string which is the same as the
          TBPlugin.plugin_name field, which can be no greater than 255
          characters.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Plugins (
          plugin_id INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        )
      ''')

  def create_plugins_table_name_index(self):
    """Uniquely indexes the name field on the plugins table."""
    with self._cursor() as c:
      c.execute('''\
        CREATE UNIQUE INDEX IF NOT EXISTS PluginsNameIndex
        ON Plugins (name)
      ''')

  def create_event_logs_table(self):
    """Creates the EventLogs table.

    Event logs are files written to disk by TensorFlow via FileWriter,
    which uses PyRecordWriter to output records containing
    binary-encoded tf.Event protocol buffers.

    This table is used by FileLoader to track the progress of files
    being loaded off disk into the database.

    Each time FileLoader runs a transaction committing events to the
    database, it updates the offset field.

    Fields:
      rowid: An arbitrary event_log_id in the first 29 bits, and the
          run_id in the higher 29 bits.
      run_id: A reference to the id field of the associated row in the
          runs table. Must be the same as what's in those rowid bits.
      path: The basename of the path of the event log file. It SHOULD be
          formatted: events.out.tfevents.UNIX_TIMESTAMP.HOSTNAME[SUFFIX]
      offset: The byte offset in the event log file *after* the last
          successfully committed event record.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS EventLogs (
          rowid INTEGER PRIMARY KEY,
          run_id INTEGER NOT NULL,
          path VARCHAR(1023) NOT NULL,
          offset INTEGER NOT NULL
        )
      ''')

  def create_event_logs_table_path_index(self):
    """Uniquely indexes the (name, path) fields on the event_logs table."""
    with self._cursor() as c:
      c.execute('''\
        CREATE UNIQUE INDEX IF NOT EXISTS EventLogsPathIndex
        ON EventLogs (run_id, path)
      ''')

  def _cursor(self):
    return contextlib.closing(self._db_conn.cursor())  # type: sqlite3.Cursor


def _is_transient_sqlite_error(exception):
  """Returns True if transaction should be retried on SQLite.

  :type exception: Exception
  """
  return (isinstance(exception, (FakeTransientDatabaseError,
                                 sqlite3.DatabaseError)) and
          not isinstance(exception, sqlite3.ProgrammingError))


class _TransactionRunner(object):
  """Utility class for running a transaction attempt.

  If TESTING_MODE is True, then the first invocation will always result
  in a roll back.
  """

  def __init__(self, connection, callback):
    """Runs a write-deferred database transaction.

    :type connection: sqlite3.Connection
    :type callback: (TransactionConnection) -> T
    """
    self._connection = connection
    self._callback = callback
    self._should_rollback = TESTING_MODE

  def __call__(self):
    """Runs a write-deferred database transaction.

    :rtype: T
    """
    with self._connection:
      write_cursor = _DeferredCursor()
      result = self._callback(
          TransactionConnection(self._connection, write_cursor))
      if self._should_rollback:
        self._should_rollback = False
        raise FakeTransientDatabaseError()
      write_cursor.replay(self._connection)
      return result


class FakeTransientDatabaseError(Exception):
  """Exception thrown to roll back transactions in TESTING_MODE."""

  def __str__(self):
    return 'FakeTransientDatabaseError'


class TransactionConnection(object):
  """Delegate for PEP 249 Connection object when in a Transaction."""

  def __init__(self, actual_connection, write_cursor):
    """Creates new instance.

    :type actual_connection: sqlite3.Connection
    :type write_cursor: _DeferredCursor
    """
    self._actual_connection = actual_connection
    self._write_cursor = write_cursor

  def cursor(self):
    """Returns a new database cursor.

    :rtype: TransactionCursor
    """
    return TransactionCursor(self, self._actual_connection, self._write_cursor)

  def execute(self, sql, parameters=()):
    """Executes a query and returns its cursor.

    If this is a write query, it won't be executed until the end of the
    transaction.

    This method is not part of PEP 249 but is part of the sqlite3 API.

    :type sql: str
    :type parameters: tuple[object]
    :rtype: TransactionCursor
    """
    cursor = self.cursor()
    cursor.execute(sql, parameters)
    return cursor

  def executemany(self, sql, seq_of_parameters=()):
    """Executes a query many times and returns its cursor.

    If this is a write query, it won't be executed until the end of the
    transaction.

    This method is not part of PEP 249 but is part of the sqlite3 API.

    :type sql: str
    :type seq_of_parameters: list[tuple[object]]
    """
    cursor = self.cursor()
    cursor.executemany(sql, seq_of_parameters)
    return cursor

  def commit(self):
    """Raises NotImplementedError.

    Simply return from the callback to commit a transaction.
    """
    raise NotImplementedError('Please return from callback to commit')

  def rollback(self):
    """Raises NotImplementedError.

    Simply throw an exception type to cause a rollback.
    """
    raise NotImplementedError('Please throw an exception to rollback')

  def close(self):
    """Raises NotImplementedError.

    It doesn't make sense to close a DB connection while inside a
    transaction.
    """
    raise NotImplementedError('Connection.close not available in Transaction')


class TransactionCursor(object):
  """Delegate for PEP 249 Cursor object when in a Transaction."""

  WRITE_QUERY_PATTERN = re.compile(r'^\s*(UPDATE|DELETE) ')

  def __init__(self, connection, actual_connection, write_cursor):
    """Creates new instance.

    :type connection: TransactionConnection
    :type actual_connection: sqlite3.Connection
    :type write_cursor: _DeferredCursor
    """
    self.connection = connection  # Cycle required by PEP 249
    self._actual_connection = actual_connection
    self._write_cursor = write_cursor
    self._cursor = None  # type: sqlite3.Cursor
    self._is_closed = False

  def execute(self, sql, parameters=()):
    """Executes a query.

    If this is a write query, it won't be executed until the end of the
    transaction.

    :type sql: str
    :type parameters: tuple[object]
    """
    if TransactionCursor.WRITE_QUERY_PATTERN.search(sql) is not None:
      self._check_closed()
      self._write_cursor.execute(sql, parameters)
      return
    self._init_cursor()
    self._cursor.execute(sql, parameters)

  def executemany(self, sql, seq_of_parameters=()):
    """Executes a query many times.

    If this is a write query, it won't be executed until the end of the
    transaction.

    :type sql: str
    :type seq_of_parameters: list[tuple[object]]
    """
    if TransactionCursor.WRITE_QUERY_PATTERN.search(sql) is not None:
      self._check_closed()
      self._write_cursor.executemany(sql, seq_of_parameters)
      return
    self._init_cursor()
    self._cursor.executemany(sql, seq_of_parameters)

  def executescript(self, sql):
    """Raises NotImplementedError.

    This method has surprising behavior with Python's SQLite driver. It
    also prevents TensorBoard's transaction system from deferring write
    queries.
    """
    raise NotImplementedError('Cursor.executescript not supported')

  def fetchone(self):
    """Returns next row in result set.

    :rtype: tuple[object]
    """
    self._check_that_read_query_was_issued()
    return self._cursor.fetchone()

  def fetchmany(self, size=None):
    """Returns next chunk of rows in result set.

    :type size: int
    """
    self._check_that_read_query_was_issued()
    if size is not None:
      return self._cursor.fetchmany(size)
    else:
      return self._cursor.fetchmany()

  def fetchall(self):
    """Returns next row in result set.

    :rtype: tuple[object]
    """
    self._check_that_read_query_was_issued()
    return self._cursor.fetchone()

  def nextset(self):
    """Raises NotImplementedError."""
    raise NotImplementedError('Cursor.nextset not supported')

  @property
  def description(self):
    """Returns information about each column in result set.

    :rtype: list[tuple[str, int, int, int, int, int bool]]
    """
    self._check_that_read_query_was_issued()
    return self._cursor.description

  @property
  def rowcount(self):
    """Returns number of rows retrieved by last read query.

    :rtype: int
    """
    self._check_that_read_query_was_issued()
    return self._cursor.rowcount

  @property
  def lastrowid(self):
    """Raises NotImplementedError.

    This is not possible to implement in TensorBoard's transaction
    system, which defers writes to the end.

    :rtype: int
    """
    self._check_that_read_query_was_issued()
    return self._cursor.rowcount

  def _get_arraysize(self):
    self._init_cursor()
    return self._cursor.arraysize

  def _set_arraysize(self, arraysize):
    self._init_cursor()
    self._cursor.arraysize = arraysize

  arraysize = property(_get_arraysize, _set_arraysize)

  def close(self):
    """Closes resources associated with cursor."""
    if self._cursor is not None:
      self._cursor.close()
      self._cursor = None
    self._is_closed = True

  def __iter__(self):
    """Returns iterator over results of last read query.

    :rtype: types.GeneratorType[tuple[object]]
    """
    self._check_that_read_query_was_issued()
    for row in self._cursor:
      yield row

  def callproc(self, procname, parameters=()):
    """Raises NotImplementedError."""
    raise NotImplementedError('Cursor.callproc not supported')

  def setinputsizes(self, sizes):
    """Raises NotImplementedError."""
    raise NotImplementedError('Cursor.setinputsizes not supported')

  def setoutputsize(self, size, column):
    """Raises NotImplementedError."""
    raise NotImplementedError('Cursor.setoutputsize not supported')

  def _init_cursor(self):
    self._check_closed()
    if self._cursor is None:
      self._cursor = self._actual_connection.cursor()

  def _check_that_read_query_was_issued(self):
    self._check_closed()
    if self._cursor is None:
      raise ValueError('no read query was issued')

  def _check_closed(self):
    if self._is_closed:
      raise ValueError('cursor was closed')


class _DeferredCursor(object):
  """Helper class for write queries."""

  def __init__(self):
    self._queries = []  # type: list[tuple[str, str, object]]

  def execute(self, sql, parameters):
    """Executes query in the future.

    :type sql: str
    :type parameters: tuple[object]
    """
    self._queries.append(('execute', sql, parameters))

  def executemany(self, sql, seq_of_parameters):
    """Executes multi-query in the future.

    :type sql: str
    :type seq_of_parameters: list[tuple[object]]
    """
    self._queries.append(('executemany', sql, seq_of_parameters))

  def replay(self, connection):
    """Executes deferred queries.

    :type connection: sqlite3.Connection
    """
    for method, sql, parameters in self._queries:
      getattr(connection, method)(sql, parameters)


class Id(object):
  """Utility class for unsigned fixed bit IDs."""

  def __init__(self, name, bits):
    """Creates new instance.

    :type name: str
    :type bits: int
    """
    if bits < 1:
      raise ValueError('bits must be >0')
    self.name = name
    self.bits = bits
    self.max = _mask(bits)

  def check(self, x):
    """Throws ValueError if x isn't in bit range.

    :type x: int
    """
    _check_id(x, self.bits, self.name)

  def generate(self):
    """Generates a random ID in the bit range.

    :rtype: int
    """
    return random.randint(0, self.max)


class RowId(object):
  """Utility class for bit-packed SQLite primary keys."""

  def __init__(self, name, global_id, local_id):
    """Creates new instance.

    :type name: str
    :type global_id: Id
    :type local_id: Id
    """
    self.name = name
    self.bits = global_id.bits + local_id.bits
    if self.bits > 63:
      raise ValueError('%s can not exceed 63 bits' % name)
    self._global = global_id
    self._local = local_id

  def create(self, high, low):
    """Creates a rowid from its global and local portions.

    :type high: int
    :type low: int
    :rtype: int
    """
    self._global.check(high)
    self._local.check(low)
    return (high << self._local.bits) + low

  def parse(self, rowid):
    """Parses a rowid into its global and local portions.

    :type rowid: int
    :rtype: tuple[int, int]
    """
    _check_id(rowid, self.bits, self.name)
    return rowid >> self._local.bits, rowid & self._local.max

  def get_range(self, high):
    """Returns an inclusive range of all possible y values.

    This is used for the SQL BETWEEN operator.

    :type high: int
    :rtype: tuple[int, int]
    """
    return self.create(high, 0), self.create(high, self._local.max)


def _check_id(id_, bits, name):
  if id_ < 0:
    raise ValueError('%s can not be a negative number: %d' % (name, id_))
  if id_ > _mask(bits):
    raise ValueError('%s must be a %d-bit number: %d' % (name, bits, id_))


def _mask(bits):
  """Returns highest integer that can be stored in `bits` unsigned bits."""
  return (1 << bits) - 1


EXPERIMENT_ID = Id('experiment_id', 28)
RUN_ID = Id('run_id', 29)
TAG_ID = Id('tag_id', 31)
TAG_PLUGIN_ID = Id('tag_plugin_id', 35)
STEP_ID = Id('step', 32)
EVENT_LOG_ID = Id('event_log_id', 29)

RUN_ROWID = RowId('Runs.rowid', EXPERIMENT_ID, RUN_ID)
TAG_ROWID = RowId('Tags.rowid', EXPERIMENT_ID, TAG_ID)
TENSOR_ROWID = RowId('Tensors.rowid', TAG_ID, STEP_ID)
EVENT_LOG_ROWID = RowId('EventLogs.rowid', RUN_ID, EVENT_LOG_ID)
