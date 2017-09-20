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

# Maximum length of string & bytes columns.
# Cloud Spanner has a limit of 10Mb per column.
# https://cloud.google.com/spanner/quotas
# MySQL can support columns larger than 10Mb.
# https://dev.mysql.com/doc/refman/5.7/en/storage-requirements.html#data-types-storage-reqs-strings
MAX_LENGTH = 10485760

class ColumnType(object):
  """Base class for column types."""

  def __init__(self, not_null=False):
    self.not_null = not_null


class BoolColumnType(ColumnType):
  """Defines a bool column."""
  pass


class BytesColumnType(ColumnType):
  """Defines a bytes column."""
  def __init__(self, length=None, **kwargs):
    """Define a bytes column.

    Args:
      length: The length of the string.

    : type lenth: int | None
    : rtype: BytesColumnType
    """
    super(BytesColumnType, self).__init__(self, **kwargs)
    if not length:
      raise ValueError('length is required')
    self.length = length


class Int64ColumnType(ColumnType):
  """Defines an integer column."""
  pass


class StringColumnType(ColumnType):
  """Defines a string column."""
  def __init__(self, length=None, **kwargs):
    """Define a string column.

    Args:
      length: The length of the string.

    :type lenth: int
    :rtype: StringColumnType
    """
    super(StringColumnType, self).__init__(self, **kwargs)
    if not length:
      raise ValueError('length is required')
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

    : type name: str
    : type value_type: list[ColumnType]
    : type not_null: list[bool]
    : rtype: ColumnSchema
    """
    self.name = name
    self.value_type = value_type
    self.not_null = not_null


class Meta(type):
  """Meta class for preserving order of attributes.

  See: https://www.python.org/dev/peps/pep-0520/#specification.
  We want to preserve the order of attributes in our Table classes.
  In 3.6 this is the default behavior but to support earlier versions of
  Python we use a meta class.
  """
  @classmethod
  def __prepare__(cls, *args, **kwargs):
    return collections.OrderedDict()


class Table():
  """Define the schema for a table."""
  __meta__ = Meta
  _columns = None

  __definition_order__ = tuple(locals())

  def __init__(self, name, columns, keys):
    """Create a table schema.

    Args:
      name: Name for the table.
      columns: List of ColumnSchema objects describing the
        schema.
      keys: List of column names comprising the key.

    Returns:
      schema: Schema for the table.

    : type name: str
    : type columns: list[ColumnSchema]
    : type keys: list[str]
    : rtype: Table
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

  @classmethod
  def columns(cls):
    """Return a dictionary mapping names to columns."""
    if not cls._columns:
      cls._columns = {}
      for k in cls.__dict__.keys():
        v = getattr(cls, k)
        if isinstance(v, ColumnType):
          cls._columns[k] = v
    return cls._columns



class BigTensorsTable(object):
  __meta__ = Meta
  rowid = Int64ColumnType()
  customer_number = Int64ColumnType()
  tag_id = Int64ColumnType(not_null=True)
  step_count = Int64ColumnType(not_null=True)
  tensor = BytesColumnType(MAX_LENGTH)

  __definition_order__ = tuple(locals())

BIG_TENSORS_TABLE = Table(
    name='BigTensors',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
             ColumnSchema('customer_number', Int64ColumnType()),
             ColumnSchema('tag_id', Int64ColumnType(), not_null=True),
             ColumnSchema('step_count', Int64ColumnType(), not_null=True),
             ColumnSchema('tensor', BytesColumnType(MAX_LENGTH))],
    keys=['rowid', 'customer_number', 'tag_id', 'step_count'])

EVENT_LOGS_TABLE = Table(
    name='EventLogs',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
             ColumnSchema('customer_number', Int64ColumnType()),
             ColumnSchema('run_id', Int64ColumnType(), not_null=True),
             ColumnSchema('event_log_id', Int64ColumnType()),
             ColumnSchema('path', StringColumnType(
                 length=1023), not_null=True),
             ColumnSchema('offset', Int64ColumnType(), not_null=True)],
    keys=['rowid', 'customer_number', 'run_id', 'event_log_id'])


EXPERIMENTS_TABLE = Table(
    name='Experiments',
    columns=[ColumnSchema('customer_number', Int64ColumnType()),
             ColumnSchema('experiment_id', Int64ColumnType()),
             ColumnSchema('name', StringColumnType(500), not_null=True),
             ColumnSchema('description', StringColumnType(
                 65535), not_null=True),],
    keys=['rowid', 'customer_number', 'experiment_id'])

PLUGINS_TABLE = Table(
    name='Plugins',
    columns=[ColumnSchema('plugin_id', Int64ColumnType()),
             ColumnSchema('name', StringColumnType(length=255), not_null=True)],
    keys=['plugin_id'])

RUNS_TABLE = Table(
    name='Runs',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
             ColumnSchema('customer_number', Int64ColumnType()),
             ColumnSchema('experiment_id', Int64ColumnType(), not_null=True),
             ColumnSchema('run_id', Int64ColumnType(), not_null=True),
             ColumnSchema('name', StringColumnType(length=1900),
                          not_null=True)],
    keys=['rowid', 'customer_number', 'experiment_id', 'run_id'])

TAGS_TABLE = Table(
    name='Tags',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
             ColumnSchema('customer_number', Int64ColumnType()),
             ColumnSchema('run_id', Int64ColumnType(), not_null=True),
             ColumnSchema('tag_id', Int64ColumnType(), not_null=True),
             ColumnSchema('plugin_id', Int64ColumnType(), not_null=True),
             ColumnSchema('name', StringColumnType(500)),
             ColumnSchema('display_name', StringColumnType(500)),
             ColumnSchema('summary_description', StringColumnType(65535)),],
    keys=['rowid', 'customer_number', 'run_id', 'tag_id'])

TENSORS_TABLE = Table(
    name='Tensors',
    columns=[ColumnSchema('rowid', Int64ColumnType()),
             ColumnSchema('customer_number', Int64ColumnType()),
             ColumnSchema('tag_id', Int64ColumnType(), not_null=True),
             ColumnSchema('step_count', Int64ColumnType(), not_null=True),
             ColumnSchema('encoding', Int64ColumnType(), not_null=True),
             ColumnSchema('is_big', BoolColumnType(), not_null=True),
             ColumnSchema('tensor', BytesColumnType(MAX_LENGTH), not_null=True)],
    keys=['rowid', 'customer_number', 'tag_id', 'step_count'])

# List of all tables.
TABLES = [BIG_TENSORS_TABLE, EVENT_LOGS_TABLE, EXPERIMENTS_TABLE, PLUGINS_TABLE,
          RUNS_TABLE, TAGS_TABLE, TENSORS_TABLE]


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

    :type name: str
    :type table: str
    :type columns: list[str]
    :rtype: IndexSchema
    """

    self.name = name
    self.table = table
    self.columns = columns


EXPERIMENTS_NAME_INDEX = IndexSchema('ExperimentsNameIndex', 'Experiments', [
    'customer_number', 'name'])

EVENT_LOGS_PATH_INDEX = IndexSchema('EventLogsPathIndex', 'EventLogs', [
    'customer_number', 'run_id', 'path'])

PLUGINS_NAME_INDEX = IndexSchema('PluginsNameIndex', 'Plugins', ['name'])

RUNS_ID_INDEX = IndexSchema('RunsIdIndex', 'Runs', [
    'customer_number', 'run_id'])

RUNS_NAME_INDEX = IndexSchema('RunsNameIndex', 'Runs', [
    'customer_number', 'experiment_id', 'name'])

TAGS_ID_INDEX = IndexSchema('TagsIdIndex', 'Tags', [
    'customer_number', 'tag_id'])

TAGS_NAME_INDEX = IndexSchema('TagsNameIndex', 'Tags', [
    'customer_number', 'run_id', 'name'])

INDEXES = [EXPERIMENTS_NAME_INDEX, EVENT_LOGS_PATH_INDEX, PLUGINS_NAME_INDEX,
           RUNS_ID_INDEX, RUNS_NAME_INDEX, TAGS_ID_INDEX, TAGS_NAME_INDEX]
