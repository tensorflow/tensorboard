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

"""TensorBoard Database Schemas.

This module adds classes to define the database scheme for TensorBoard.
The classes provide a database independent way to specify the scheme
so that we can easily add support for new databases.

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

class ColumnType(object):
  pass

class BoolColumnType(ColumnType):
  pass

class BytesColumnType(ColumnType):
  def __init__(self, length=None):
    """Define a bytes column.

    Args:
      length: The length of the string. None indicates column
        should have maximum length allowed.
    """
    self.length = length

class Int64ColumnType(ColumnType):
  pass

class StringColumnType(ColumnType):

  def __init__(self, length=None):
    """Define a string column.

    Args:
      length: The length of the string. None indicates column
        should have maximum length allowed.
    """
    self.length = length

# TODO(jlewi): Add a description field to columns?
class ColumnSchema(object):
  """Defines the schema for a column."""

  def __init__(self, name, value_type, not_null=False):
    """Define a column.

    Args:
      name: Name of the column.
      value_type: A ColumnType object describing the type for the
        column.
      not_null: If true then column is required to be not null.
    """
    self.name = name
    self.value_type = value_type
    self.not_null = not_null

class TableSchema(object):
  """Define the schema for a table."""

  def __init__(self, name, columns, keys):
    """Create a table schema.

    Args:
      name: Name for the table.
      columns: List of ColumnSchema objects describing the
        schema.
      keys: List of column names comprising the key.

    Returns:
      schema: Schema for the table.
    """
    self.name = name
    self._columns = columns
    self._keys = keys

    self._name_to_column = {}
    for c in self._columns:
      self._name_to_column[c.name] = c

  @property
  def keys(self):
    return self._keys

  @property
  def columns(self):
    return self._columns

  def get_column(self, name):
    """Get the column with the specified name.

    Raises:
      ValueError if no column with the specified name.
    """
    return self._name_to_column[name]

BIG_TENSORS_TABLE = TableSchema(
  name = 'BigTensors',
        columns=[ColumnSchema('rowid', Int64ColumnType()),
               ColumnSchema('customer_number', Int64ColumnType()),
               ColumnSchema('tag_id', Int64ColumnType(), not_null=True),
               ColumnSchema('step_count', Int64ColumnType(), not_null=True),
               ColumnSchema('tensor', BytesColumnType())],
      keys=['rowid', 'customer_number','tag_id', 'step_count'])

EVENT_LOGS_TABLE = TableSchema(
  name = 'EventLogs',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
           ColumnSchema('customer_number', Int64ColumnType()),
           ColumnSchema('run_id', Int64ColumnType(), not_null=True),
           ColumnSchema('event_log_id', Int64ColumnType(), not_null=True),
           ColumnSchema('path', StringColumnType(length=1023), not_null=True),
           ColumnSchema('offset', Int64ColumnType(), not_null=True)],
  keys=['rowid', 'customer_number', 'run_id', 'event_log_id'])


EXPERIMENTS_TABLE = TableSchema(
  name = 'Experiments',
    columns=[ColumnSchema('customer_number', Int64ColumnType()),
           ColumnSchema('experiment_id', Int64ColumnType()),
           ColumnSchema('name', StringColumnType(500), not_null=True),
           ColumnSchema('description', StringColumnType(65535), not_null=True),
           ],
  keys = ['rowid', 'customer_number', 'experiment_id'])

PLUGINS_TABLE = TableSchema(
  name = 'Plugins',
    columns=[ColumnSchema('plugin_id', Int64ColumnType()),
             ColumnSchema('name', StringColumnType(length=255), not_null=True)],
  keys=['plugin_id'])

RUNS_TABLE = TableSchema(
  name = 'Runs',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
           ColumnSchema('customer_number', Int64ColumnType()),
           ColumnSchema('experiment_id', Int64ColumnType(), not_null=True),
           ColumnSchema('run_id', Int64ColumnType(), not_null=True),
           ColumnSchema('name', StringColumnType(length=1900), not_null=True)],
  keys=['rowid', 'customer_number','experiment_id', 'run_id'])

TAGS_TABLE = TableSchema(
  name='Tags',
  columns=[ColumnSchema('rowid', Int64ColumnType()),
           ColumnSchema('customer_number', Int64ColumnType()),
           ColumnSchema('run_id', Int64ColumnType(), not_null=True),
           ColumnSchema('tag_id', Int64ColumnType(), not_null=True),
           ColumnSchema('plugin_id', Int64ColumnType(), not_null=True),
           ColumnSchema('name', StringColumnType(500)),
           ColumnSchema('display_name', StringColumnType(500)),
           ColumnSchema('summary_description', StringColumnType(65535)),
           ],
           keys=['rowid', 'customer_number', 'run_id', 'tag_id'])

TENSORS_TABLE = TableSchema(
  name = 'Tensors',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
           ColumnSchema('customer_number', Int64ColumnType()),
           ColumnSchema('tag_id', Int64ColumnType(), not_null=True),
           ColumnSchema('step_count', Int64ColumnType(), not_null=True),
           ColumnSchema('encoding', Int64ColumnType(), not_null=True),
           ColumnSchema('is_big', BoolColumnType(), not_null=True),
           ColumnSchema('tensor', BytesColumnType(), not_null=True)],
  keys=['rowid', 'customer_number','tag_id', 'step_count'])

# List of all tables.
TABLES = [BIG_TENSORS_TABLE, EVENT_LOGS_TABLE, EXPERIMENTS_TABLE, PLUGINS_TABLE, RUNS_TABLE,
          TAGS_TABLE, TENSORS_TABLE]

class IndexSchema(object):
  """Define the schema for an index."""

  def __init__(self, name, table, columns):
    """Create the schema for an index.

    Args:
      name: Name for the index.
      table: Name of the table to create the index from.
      columns: The names of the columns comprising the index.

    Returns:
      IndexSchema representing the schema.
    """

    self.name = name
    self.table = table
    self.columns = columns

EXPERIMENTS_NAME_INDEX = IndexSchema('ExperimentsNameIndex', 'Experiments', ['customer_number', 'name'])

EVENT_LOGS_PATH_INDEX = IndexSchema('EventLogsPathIndex', 'EventLogs', ['customer_number', 'run_id', 'path'])

PLUGINS_NAME_INDEX = IndexSchema('PluginsNameIndex', 'Plugins', ['name'])

RUNS_ID_INDEX = IndexSchema('RunsIdIndex', 'Runs', ['customer_number', 'run_id'])

RUNS_NAME_INDEX = IndexSchema('RunsNameIndex', 'Runs', ['customer_number', 'experiment_id', 'name'])

TAGS_ID_INDEX = IndexSchema('TagsIdIndex', 'Tags', ['customer_number', 'tag_id'])

TAGS_NAME_INDEX = IndexSchema('TagsNameIndex', 'Tags', ['customer_number', 'run_id', 'name'])

INDEXES = [EXPERIMENTS_NAME_INDEX, EVENT_LOGS_PATH_INDEX, PLUGINS_NAME_INDEX,
           RUNS_ID_INDEX, RUNS_NAME_INDEX, TAGS_ID_INDEX, TAGS_NAME_INDEX]