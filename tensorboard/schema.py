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

WARNING: This module is EXPERIMENTAL. It will not be considered stable
until data migration tools are put into place. Until that time, any
database created with this schema will need to be deleted as new updates
occur.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

# This table is meant for tensors larger than half a b-tree page.
# Please note that some databases, e.g. MySQL, will store these
# tensors off-page.
# Fields:
#   rowid: Must be same as corresponding Tensors table row.
#   tensor: A binary representation of this tensor, using the encoding
#           specified in the corresponding Tensors table row.
BIG_TENSORS_TABLE = ('CREATE TABLE IF NOT EXISTS BigTensors ('
                     'rowid INTEGER PRIMARY KEY, '
                     'customer_number INTEGER, '
                     'tag_id INTEGER NOT NULL, '
                     'step_count INTEGER NOT NULL, '
                     'tensor BLOB)')

# Event logs are files written to disk by TensorFlow via FileWriter,
# which uses PyRecordWriter to output records containing
# binary-encoded tf.Event protocol buffers.
# This table is used by FileLoader to track the progress of files
# being loaded off disk into the database.
# Each time FileLoader runs a transaction committing events to the
# database, it updates the offset field.
#
# rowid: An arbitrary event_log_id in the first 29 bits, and the
#   run_id in the higher 29 bits.
# customer_number: Integer identyfing the customer that owns this row.
# event_log_id: Unique id identifying this event log.
# run_id: A reference to the id field of the associated row in the
#  runs table. Must be the same as what's in the rowid bits.
# path: The basename of the path of the event log file. It SHOULD be
#  formatted: events.out.tfevents.UNIX_TIMESTAMP.HOSTNAME[SUFFIX]
# offset: The byte offset in the event log file *after* the last
#   successfully committed event record.
EVENT_LOGS_TABLE = ('CREATE TABLE IF NOT EXISTS EventLogs ('
                    'rowid INTEGER PRIMARY KEY, '
                    'customer_number INTEGER, '
                    'run_id INTEGER NOT NULL, '
                    'event_log_id INTEGER, '
                    'path VARCHAR(1023) NOT NULL, '
                    'offset INTEGER NOT NULL)')

# This table stores information about experiments, which are sets of
# runs.
# Fields:
# customer_number: Integer identyfing the customer that owns this row.
# experiment_id: Random integer primary key in range [0,2^28).
# name: (Uniquely indexed) Arbitrary string which is displayed to
#   the user in the TensorBoard UI, which can be no greater than
#   500 characters.
# description: Arbitrary markdown text describing the experiment.
EXPERIMENTS_TABLE = ('CREATE TABLE IF NOT EXISTS Experiments ('
                     'customer_number INTEGER PRIMARY KEY, '
                     'experiment_id INTEGER, '
                     'name VARCHAR(500) NOT NULL, '
                     'description TEXT NOT NULL)')

# This table exists to assign arbitrary IDs to TBPlugin names. These
# IDs are handed out in monotonically increasing order, but that's OK,
# because the size of this table will be extremely small. These IDs
# will not be the same across TensorBoard installs.
# It is assumed that once an ID is mapped to a name, that the mapping
# will never change.
# Fields:
#   plugin_id: Arbitrary integer arbitrarily limited to 16-bits.
#   name: Arbitrary string which is the same as the
#       TBPlugin.plugin_name field, which can be no greater than 255
#       characters.
PLUGINS_TABLE = ('CREATE TABLE IF NOT EXISTS Plugins ('
                 'plugin_id INTEGER PRIMARY KEY, '
                 'name VARCHAR(255) NOT NULL)')

# This table stores information about runs. Each row usually
# represents a single attempt at training or testing a TensorFlow
# model, with a given set of hyper-parameters, whose summaries are
# written out to a single event logs directory with a monotonic step
# counter.
# When a run is deleted from this table, TensorBoard SHOULD treat all
# information associated with it as deleted, even if those rows in
# different tables still exist.
#
# Fields:
# rowid: Row ID which has run_id in the low 29 bits and
#        experiment_id in the higher 28 bits. This is used to control
#        locality.
# customer_number: Integer identyfing the customer that owns this row.
# experiment_id: The 28-bit experiment ID.
# run_id: Unique randomly generated 29-bit ID for this run.
# name: Arbitrary string which is displayed to the user in the
#       TensorBoard UI, which is unique within a given experiment,
#       which can be no greater than 1900 characters.
RUNS_TABLE = ('CREATE TABLE IF NOT EXISTS Runs ('
              'rowid INTEGER PRIMARY KEY, '
              'customer_number INTEGER, '
              'experiment_id INTEGER NOT NULL, '
              'run_id INTEGER NOT NULL, '
              'name VARCHAR(1900) NOT NULL)')

# Tags table.
# Fields:
#   rowid: The rowid which has tag_id field in the low 31 bits and the
#           experiment ID in the higher 28 bits.
#   customer_number: Integer identyfing the customer that owns this row.
#   tag_id: Unique randomly distributed 31-bit ID for this tag.
#   run_id: The id of the row in the runs table, with which this tag
#           is associated.
#   plugin_id: The ID of the related row in the Plugins table.
#   name: The tag. See the tag field in summary.proto for more
#         information, which can be no greater than 500 characters.
#   display_name: Same as SummaryMetadata.display_name, if set, which
#                 can be no greater than 500 characters.
#   summary_description: Same as SummaryMetadata.summary_description,
#     if set. This is Markdown describing the summary.
TAGS_TABLE = ('CREATE TABLE IF NOT EXISTS Tags ('
              'rowid INTEGER PRIMARY KEY, '
              'customer_number INTEGER, '
              'run_id INTEGER NOT NULL, '
              'tag_id INTEGER NOT NULL, '
              'plugin_id INTEGER NOT NULL, '
              'name VARCHAR(500), '
              'display_name VARCHAR(500), '
              'summary_description TEXT)')

# This table is designed to offer contiguous in-page data storage.
# Fields:
#  rowid: A 63-bit number containing the step count in the low 32
#      bits, and the randomly generated tag ID in the higher 31 bits.
#  customer_number: Integer identyfing the customer that owns this row.
#  encoding: A number indicating how the tensor was encoded to the
#      tensor blob field. 0 indicates an uncompressed binary Tensor
#      proto. 1..9 indicates a binary Tensor proto gzipped at the
#      corresponding level. 10..255 are reserved for future encoding
#      methods.
#  is_big: A boolean indicating that the tensor field is empty and a
#      separate asynchronous lookup should be performed on the
#      BigTensors table.
#  tensor: A binary representation of this tensor. This will be empty
#      if the is_big field is true.
TENSORS_TABLE = ('CREATE TABLE IF NOT EXISTS Tensors ('
                 'rowid INTEGER PRIMARY KEY, '
                 'customer_number INTEGER, '
                 'tag_id INTEGER NOT NULL, '
                 'step_count INTEGER NOT NULL, '
                 'encoding INTEGER NOT NULL, '
                 'is_big BOOLEAN NOT NULL, '
                 'tensor BLOB NOT NULL)')

EXPERIMENTS_NAME_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                          'ExperimentsNameIndex ON Experiments '
                          '(customer_number, name)')

EVENT_LOGS_PATH_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                         'EventLogsPathIndex ON EventLogs '
                         '(customer_number, run_id, path)')

PLUGINS_NAME_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                      'PluginsNameIndex ON Plugins '
                      '(name)')

RUNS_ID_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                 'RunsIdIndex ON Runs '
                 '(customer_number, run_id)')

RUNS_NAME_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                   'RunsNameIndex ON Runs '
                   '(customer_number, experiment_id, name)')

TAGS_ID_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                 'TagsIdIndex ON Tags '
                 '(customer_number, tag_id)')

TAGS_NAME_INDEX = ('CREATE UNIQUE INDEX IF NOT EXISTS '
                   'TagsNameIndex ON Tags '
                   '(customer_number, run_id, name)')

# List of all tables.
TABLES = [BIG_TENSORS_TABLE, EVENT_LOGS_TABLE, EXPERIMENTS_TABLE, PLUGINS_TABLE,
          RUNS_TABLE, TAGS_TABLE, TENSORS_TABLE]


# List of all indexes
INDEXES = [EXPERIMENTS_NAME_INDEX, EVENT_LOGS_PATH_INDEX, PLUGINS_NAME_INDEX,
           RUNS_ID_INDEX, RUNS_NAME_INDEX, TAGS_ID_INDEX, TAGS_NAME_INDEX]
