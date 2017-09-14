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

"""Cloud Spanner support.

This module adds functionality to use Cloud Spanner as the backing database for TensorBoard.
TensorBoard is designed to use a PEP 249 db. Cloud Spanner doesn't have a PEP 249 compliant DB.
See: https://github.com/GoogleCloudPlatform/google-cloud-python/wiki/Feature-Backlog.

A PEP 249 API for Cloud Spanner is blocked by lack of DML support for Cloud Spanner. This shouldn't block supporting
Cloud Spanner with TensorBoard because TensorBoard is largely read only.

WARNING: This module is EXPERIMENTAL. It will not be considered stable
until data migration tools are put into place. Until that time, any
database created with this schema will need to be deleted as new updates
occur.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from google.cloud import spanner
from google.gax import errors
from google.api.core import exceptions
import logging
import re
from tensorboard import db
from tensorboard import schema

def to_spanner_type(column_type):
  """Return the Cloud Spanner type corresponding to the supplied type.

  Args:
    column_type: Instance of ColumnType.

  Returns:
    string identify the spanner column type.
  """
  if isinstance(column_type, Int64ColumnType):
    return 'INT64'

  if isinstance(column_type, StringColumnType):
    if column_type.length:
      return 'STRING({0})'.format(column_type.length)
    else:
      return 'STRING(MAX)'

def schema_to_spanner_ddl(schema):
  """Convert a TableSchema object to a spanner DDL statement.

  Args:
    schema: TableSchema object representing the schema for the table.

  Returns:
    ddl statement to create the table.

  : type schema: TableSchema
  : rtype : str
  """
  # TODO(jlewi): Add support for not null modifier.
  columns = []
  for c in spec.columns:
    s = '{0} {1}'.format(c.name, to_spanner_type(c.value_type))
    columns.append(s)
  columns = ', '.join(columns)
  keys = ', '.join(schema.keys)
  ddl = 'CREATE TABLE {name} ({columns}) PRIMARY KEY ({key_fields})'.format(
    name = schema.name, columns = columns, key_fields=keys)
  return ddl

class CloudSpannerConnection(object):
  """Connection to Cloud Spanner database.
  """

  def __init__(self, project, instance, database):
    """Create a connection to a Cloud Spanner Database

    Args:
      project: The project that owns the DB.
      instance: The name of the instance to use.
      database: The name of the database.
    """
    # TODO(jlewi): Should we take client as an argument?
    self.client = spanner.Client(project=project)
    self.instance_id = instance
    self.database_id = database
    self._instance = None
    self._database = None

  def cursor(self):
    """Construct a cursor for Cloud Spanner."""
    # TODO(jlewi): Is constructing a db.Cursor with delegate set to
    # CloudSpannerCursor the right pattern?
    delegate = CloudSpannerCursor(self.client, self.database_id, self.instance_id)
    cursor = db.Cursor(self)
    cursor._delegate = delegate
    return cursor

  @property
  def database(self):
    """Return the CloudSpanner Database object.

    This method is not part of PEP249.
    """
    if not self._database:
      self._database = self.instance.database(self.database_id)
    return self._database

  @property
  def instance(self):
    """Return the CloudSpanner instance object.

    This method is not part of PEP249.
    """
    if not self._instance:
      self._instance = spanner.client.Instance(self.instance_id, self.client)
    return self._instance

class CloudSpannerCursor(object):
  """Cursor for Cloud Spanner.

  When executing an SQL select query, the cursor will load all rows into memory when execute
  as called as opposed to streaming the results based on calls to fetchone and fetchmany.
  This is a pretty naive implementation that could be inefficient when returning many rows.
  We should consider improving that in the future.
  """

  def __init__(self, client, database_id, instance_id):
    """ Create the Cursor.

    :param client: Spanner client.
    :param dabase_id: Database id.
    """
    self.client = client
    self.database_id = database_id
    self.instance_id = instance_id
    # TODO(jlewi): Should we take in a CloudSpannerConnection and reuse the instance and db associated with
    # that connection?
    self.instance = spanner.client.Instance(instance_id, client)

    # Store results of an SQL query for use in cursor operation
    # rindex points to the position in _results of the next row to return.
    self._results = []
    self._rindex = 0

  def execute(self, sql, parameters=()):
    """Executes a single query.

    :type sql: str
    :type parameters: tuple[object]
    """
    # TODO(jlewi): Should we check that the DB exists and if not raise an error?
    # TODO(jlewi): What is the substitution syntax for parameters? Is this a PEP 249 convention?
    # TODO(jlewi): According to db.Connection.execute execute shouldn't execute until end
    # of transaction so we may need to rethink how this works.
    # I just guessed that Python format would work.
    self.database = self.instance.database(self.database_id)

    parsed = parse_sql(sql, parameters)

    if not parsed:
      raise ValueError('SQL query {} is not supported for Cloud Spanner.'.format(sql))

    if isinstance(parsed, InsertSQL):
      with self.database.batch() as batch:
        batch.insert(
              table=parsed.table,
                columns=parsed.columns,
                values=[parsed.values])

      return

    if isinstance(parsed, SelectSQL):
      session = self.database.session()
      session.create()
      results = session.execute_sql(parsed.sql)
      results.consume_all()
      self._results = results.rows
      self._rindex = 0
      return

    # TODO(jlewi): Update the code to handle update ddl statements.
    #else:
      #try:
        #op = self.database.update_ddl([sql.format(parameters)])
      #except errors.RetryError as e:
        #logging.error("There was a problem creating the database. %s", e.cause.details())
        #raise
      ## TODO(jlewi): Does this block until op completes?
      #op.result()

  #def executemany(self, sql, seq_of_parameters=()):
    #"""Executes a single query many times.

    #:type sql: str
    #:type seq_of_parameters: list[tuple[object]]
    #"""
    #self._init_delegate()
    #self._delegate.executemany(sql, seq_of_parameters)

  #def executescript(self, sql):
    #"""Executes a script of many queries.

    #:type sql: str
    #"""
    #self._init_delegate()
    #self._delegate.executescript(sql)

  def fetchone(self):
    """Returns next row in result set.

    :rtype: tuple[object]
    """
    if self._rindex < len(self._results):
      self._rindex += 1
      return self._results[self._rindex - 1]

  def fetchmany(self, size=None):
    """Returns next chunk of rows in result set.

    :type size: int
    """
    start_index = self._rindex
    if size is not None:
      end_index = start_index + size
    else:
      end_index = len(self._results)

    self._rindex = end_index
    return self._results[start_index:end_index]

  def fetchall(self):
    """Returns next row in result set.

    :rtype: tuple[object]
    """
    start_index = self._rindex
    end_index = len(self._results)
    self._rindex = end_index
    return self._results[start_index:end_index]

  #@property
  #def description(self):
    #"""Returns information about each column in result set.

    #See: https://www.python.org/dev/peps/pep-0249/

    #:rtype: list[tuple[str, int, int, int, int, int, bool]]
    #"""
    #self._check_that_read_query_was_issued()
    #return self._delegate.description

  #@property
  #def rowcount(self):
    #"""Returns number of rows retrieved by last read query.

    #:rtype: int
    #"""
    #self._check_that_read_query_was_issued()
    #return self._delegate.rowcount

  #@property
  #def lastrowid(self):
    #"""Returns last row ID.

    #:rtype: int
    #"""
    #self._check_that_read_query_was_issued()
    #return self._delegate.lastrowid

  #def _get_arraysize(self):
    #self._init_delegate()
    #return self._delegate.arraysize

  #def _set_arraysize(self, arraysize):
    #self._init_delegate()
    #self._delegate.arraysize = arraysize

  #arraysize = property(_get_arraysize, _set_arraysize)

  def close(self):
    """Closes resources associated with cursor."""
    # TODO(jlewi): Are there any spanner resources that should be released
    pass

  #def __iter__(self):
    #"""Returns iterator over results of last read query.

    #:rtype: types.GeneratorType[tuple[object]]
    #"""
    #self._check_that_read_query_was_issued()
    #for row in self._delegate:
      #yield row

  #def nextset(self):
    #"""Raises NotImplementedError."""
    #raise NotImplementedError('Cursor.nextset not supported')

  #def callproc(self, procname, parameters=()):
    #"""Raises NotImplementedError."""
    #raise NotImplementedError('Cursor.callproc not supported')

  #def setinputsizes(self, sizes):
    #"""Raises NotImplementedError."""
    #raise NotImplementedError('Cursor.setinputsizes not supported')

  #def setoutputsize(self, size, column):
    #"""Raises NotImplementedError."""
    #raise NotImplementedError('Cursor.setoutputsize not supported')

  #def _init_delegate(self):
    #self._check_closed()
    #if self._delegate is None:
      #self._delegate = self.connection._delegate.cursor()

  #def _check_that_read_query_was_issued(self):
    #self._check_closed()
    #if self._delegate is None:
      #raise ValueError('no read query was issued')

  #def _check_closed(self):
    #if self._is_closed:
      #raise ValueError('cursor was closed')


# TODO(jlewi): Do we really need to subclass db.Schema? With Cloud Spanner Database creation
# is a one time setup event. We shouldn't be creating tables dynamically. If we are something
# is probably wrong.
class CloudSpannerSchema(db.Schema):
  def create_tables(self):
    # Create an empty database.
    ddl = [schema_to_spanner_ddl(t) for t in schema.TABLES]
    ddl.extend([schema_to_spanner_ddl(t) for t in schema.INDEXES])
    database = self._db_conn.instance.database(self._db_conn.database_id, ddl)
    try:
      op = database.create()
      op.result()
    except errors.RetryError as e:
      logging.error("There was a problem creating the database. %s", e.cause.details())
      raise

  def create_experiments_table(self):
    """Creates the Experiments table.

    This table stores information about experiments, which are sets of
    runs.

    Fields:
      customer_number: Int64 identifying a customer. Project number is one
        possible id.
      experiment_id: Random integer in range [0,2^28).
      name: (Uniquely indexed) Arbitrary string which is displayed to
          the user in the TensorBoard UI, which can be no greater than
          500 characters.
      description: Arbitrary markdown text describing the experiment.
    """
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(EXPERIMENTS_TABLE))

  def create_experiments_table_name_index(self):
    """Uniquely indexes the customer_number, name field on the Experiments table."""
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.EXPERIMENTS_NAME_INDEX))

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
      customer_number: INT64 identifying the customer that owns the row.
      experiment_id: The 28-bit experiment ID.
      run_id: Unique randomly generated 29-bit ID for this run.
      name: Arbitrary string which is displayed to the user in the
          TensorBoard UI, which is unique within a given experiment,
          which can be no greater than 1900 characters.
    """

    # TODO(jlewi): Should experiment_id be before run_id in the primary key?
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(RUNS_TABLE))

  def create_runs_table_id_index(self):
    """Uniquely indexes the run_id field on the Runs table."""
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.RUNS_ID_INDEX))

  def create_runs_table_name_index(self):
    """Uniquely indexes the name field on the Runs table.

    More accurately, this indexes (experiment_id, name).
    """
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.RUNS_NAME_INDEX))

  def create_tags_table(self):
    """Creates the Tags table.

    Fields:
      rowid: The rowid which has tag_id field in the low 31 bits and the
          experiment ID in the higher 28 bits.
      customer_number: INT64 identifying the customer that owns the row.
      tag_id: Unique randomly distributed 31-bit ID for this tag.
      run_id: The id of the row in the runs table, with which this tag
          is associated.
      plugin_id: The ID of the related row in the Plugins table.
      name: The tag. See the tag field in summary.proto for more
          information, which can be no greater than 500 characters.
      display_name: Same as SummaryMetadata.display_name, if set, which
          can be no greater than 500 characters.
      summary_description: Same as SummaryMetadata.summary_description,
          if set. This is Markdown describing the summary.
    """
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.TAGS_TABLE))

  def create_tags_table_id_index(self):
    """Indexes the tag_id field on the Tags table."""
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.TAGS_ID_INDEX))

  def create_tags_table_name_index(self):
    """Indexes the name field on the Tags table."""
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.TAGS_NAME_INDEX))

  # TODO(jlewi): Unlike the sqllite schema, we use a multi-field key
  # and have separate fields for step count and tag id. Discuss with jart@
  #
  # TODO(jlewi): bytes has a max size of 10Mb. Is this going to be an issue?
  def create_tensors_table(self):
    """Creates the Tensors table.

    This table is designed to offer contiguous in-page data storage.

    Fields:
      rowid: A 63-bit number containing the step count in the low 32
          bits, and the randomly generated tag ID in the higher 31 bits.
      customer_number: INT64 identifying the customer that owns the row.
      tag_id: Unique randomly distributed 31-bit ID for this tag.
      step_count: The step count associated with this Tensor.
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
      c.execute(schema_to_spanner_ddl(schema.TENSORS_TABLE))

  # TODO(jlewi): bytes fields can be a max of 10Mb. Is this going to be an issue?
  # Should we consider storing Tensors as URIs pointing at other locations?
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
      c.execute(schema_to_spanner_ddl(schema.BIG_TENSORS_TABLE))

  # TODO(jlewi): Should this table include a customer_number? I don't think
  # so because the plugins would be determined by the TB service not users.
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
    # TODO(jlewi): Should plugins be customer specific.
    with self._cursor() as c:
      c.execute(schema.PLUGINS_TABLE)

  def create_plugins_table_name_index(self):
    """Uniquely indexes the name field on the plugins table."""
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.PLUGINS_NAME_INDEX))

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
      customer_number: INT64 identifying the customer that owns the row.
      run_id: A reference to the id field of the associated row in the
          runs table.
      event_log_id:  An arbitrary event_log_id.
      path: The basename of the path of the event log file. It SHOULD be
          formatted: events.out.tfevents.UNIX_TIMESTAMP.HOSTNAME[SUFFIX]
      offset: The byte offset in the event log file *after* the last
          successfully committed event record.
    """
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.EVENT_LOGS_TABLE))

  def create_event_logs_table_path_index(self):
    """Uniquely indexes the (name, path) fields on the event_logs table."""
    with self._cursor() as c:
      c.execute(schema_to_spanner_ddl(schema.EVENT_LOGS_PATH_INDEX))


class InsertSQL(object):
  """Represent and InsertSQL statement."""

  def __init__(self, table, columns, values):
    self.table = table
    self.columns = columns
    self.values = values

# \s matches any whitespace
INSERT_PATTERN = re.compile("\s*insert\s*into\s*([a-z0-9_]*)\s*\(([a-z0-9,_\s]*)\)\s*values\s*\(([a-z0-9,_\s]*)\)", flags=re.IGNORECASE)

SELECT_PATTERN = re.compile("\s*select.*", flags=re.IGNORECASE)

class SelectSQL(object):
  """Reprsent a Select SQL statement."""

  def __init__(self, sql):
    self.sql = sql

def parse_sql(sql, parameters):
  """Parse an sql statement.

  Args:
    sql: An SQL statement.
    parameters: Parameters to substitute into the query.

  Returns:
    obj: InsertSQL or SelectSQL or UpdateSQL object containing the result.

  : type sql:str
  : rtype: InsertSQL | SelectSQL | UpdateSQL | None
  """

  # Perform variable substitution
  sql = sql.replace("?", "{}")
  sql = sql.format(*parameters)

  m = INSERT_PATTERN.match(sql)
  if m:
    table = m.group(1)
    columns = [c.strip() for c in m.group(2).split(',')]
    values = [v.strip() for v in m.group(3).split(',')]
    return InsertSQL(table, columns, values)

  m= SELECT_PATTERN.match(sql)
  if m:
    return SelectSQL(sql)