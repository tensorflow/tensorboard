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

def to_spanner_ddl(schema):
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