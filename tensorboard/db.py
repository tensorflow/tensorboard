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
import random
import sqlite3  # pylint: disable=unused-import
import threading


class TensorBase(object):
  """API for TensorBase.

  This class is thread safe.
  """

  def __init__(self, db_connection_provider):
    """Creates new instance.

    :type db_connection_provider: () -> sqlite3.Connection
    """
    self._db_connection_provider = db_connection_provider
    self._plugin_ids_by_name = {}  # type: dict[str, int]
    self._plugin_ids_by_name_lock = threading.Lock()

  def get_plugin_ids(self, names):
    """Gets IDs of plugins, creating rows if they don't exist.

    This function maintains a cache of the plugins table in local memory,
    to avoid performing queries when possible. When writing to the table,
    this function is optimistic and can cause the outer transaction to
    abort, in which case it will need to be retried.

    Args:
      db_conn: A PEP 249 Connection object.
      names: An iterable of strings of plugin names.

    Returns:
      Map of plugin names to their permanent arbitrary IDs.

    :type names: list[str]
    :rtype: dict[str, int]
    """
    result = {}
    names_set = set(names)
    with self._plugin_ids_by_name_lock:
      for name in names:
        id_ = self._plugin_ids_by_name.get(name)
        if id_ is not None:
          result[name] = id_
          names_set.remove(name)
      if names_set:
        # TODO(@jart): Retry transaction with exponential backoff.
        with contextlib.closing(self._db_connection_provider()) as conn:
          with conn:
            with contextlib.closing(conn.cursor()) as c:
              c.execute('SELECT plugin_id, name FROM plugins')
              self._plugin_ids_by_name.clear()
              max_id = 0
              for id_, name in c.fetchall():
                if id_ > max_id:
                  max_id = id_
                self._plugin_ids_by_name[name] = id_
                if name in names_set:
                  result[name] = id_
                  names_set.remove(name)
              new_rows = []
              for name in names_set:
                max_id += 1
                result[name] = max_id
                new_rows.append((max_id, name))
              if new_rows:
                c.executemany(
                    'INSERT INTO plugins (plugin_id, name) VALUES (?, ?)',
                    new_rows)
    return result


class Schema(object):
  """SQL schema creation tool for TensorBase."""

  def __init__(self, db_conn):
    """Creates new instance.

    :type db_conn: sqlite3.Connection
    """
    self._db_conn = db_conn
    self._plugin_ids_by_name = {}  # type: dict[str, int]
    self._plugin_ids_by_name_lock = threading.Lock()

  def create_tables(self):
    """Creates SQL tables needed by TensorBoard.

    If the tables are already created, this function has no effect.

    Please note that the create_indexes() method should be called after
    this method. It might be advantageous in certain circumstances to
    hold off on calling that method, for example when loading a really
    large backup into a fresh database.

    Args:
      db_conn: A PEP 249 Connection object.
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

    Args:
      db_conn: A PEP 249 Connection object.
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
          the user in the TensorBoard UI.
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

    This table stores information about runs. Each row usually represents
    a single attempt at training or testing a TensorFlow model, with a
    given set of hyper-parameters, whose summaries are written out to a
    single event logs directory with a monotonic step counter.

    When a run is deleted from this table, TensorBoard SHOULD treat all
    information associated with it as deleted, even if those rows in
    different tables still exist.

    Fields:
      rowid: Row ID which has run_id in the low 29 bits and experiment_id
          in the higher 28 bits. This is used to control locality.
      experiment_id: The 28-bit experiment ID.
      run_id: Unique randomly generated 29-bit ID for this run.
      name: Arbitrary string which is displayed to the user in the
          TensorBoard UI, which is unique within a given experiment.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Runs (
          rowid INTEGER PRIMARY KEY,
          run_id INTEGER NOT NULL,
          experiment_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL
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
      run_id: The id of the row in the runs table, with which this tag is
          associated.
      name: The tag. See the tag field in summary.proto for more
          information.
      display_name: Same as SummaryMetadata.display_name, if set.
      summary_description: Same as SummaryMetadata.summary_description,
          if set. This is Markdown describing the summary.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS Tags (
          rowid INTEGER PRIMARY KEY,
          tag_id INTEGER NOT NULL,
          run_id INTEGER NOT NULL,
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

  def create_tags_plugins_table(self):
    """Creates the TagsPlugins table.

    This table defines a many-to-many mapping between Tags and Plugins.
    It is assumed that all rows associated with a given experiment will
    be fetched at once.

    Fields:
      rowid: The rowid which has an arbitrary number in the low 38 bits
          and the experiment ID in the higher 28 bits. This is used to
          control locality.
      tag_id: The ID of the related row in the Tags table.
      plugin_id: The ID of the related row in the Plugins table.
    """
    with self._cursor() as c:
      c.execute('''\
        CREATE TABLE IF NOT EXISTS TagsPlugins (
          rowid INTEGER PRIMARY KEY,
          tag_id INTEGER NOT NULL,
          plugin_id INTEGER NOT NULL
        )
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
          tensor BLOB NOT NULL  -- VARBINARY on MySQL, MS-SQL, etc.
        )
      ''')

  def create_big_tensors_table(self):
    """Creates the BigTensors table.

    This table is meant for tensors larger than half a b-tree page.
    Some databases, e.g. MySQL, will store these tensors off-page,
    thereby making BigTensors O(nlogn) cf. Tensors.

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
      name: (Uniquely indexed) Arbitrary string which is the same as the
          TBPlugin.plugin_name field.
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
    which uses PyRecordWriter to output records containing binary-encoded
    tf.Event protocol buffers.

    This table is used by FileLoader to track the progress of files being
    loaded off disk into the database.

    Each time FileLoader runs a transaction committing events to the
    database, it updates the offset field.

    Fields:
      rowid: An arbitrary event_log_id in the first 29 bits, and the
          run_id in the higher 29 bits.
      run_id: A reference to the id field of the associated row in the
          runs table. Must be the same as what's in those rowid bits.
      path: The basename of the path of the event log file. It SHOULD be
          formatted: events.out.tfevents.UNIX_TIMESTAMP.HOSTNAME[SUFFIX].
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
TAG_PLUGIN_ROWID = RowId('TagsPlugins.rowid', EXPERIMENT_ID, TAG_PLUGIN_ID)
TENSOR_ROWID = RowId('Tensors.rowid', TAG_ID, STEP_ID)
EVENT_LOG_ROWID = RowId('EventLogs.rowid', RUN_ID, EVENT_LOG_ID)
