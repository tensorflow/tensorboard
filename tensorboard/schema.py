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

BIG_TENSORS_TABLE = ('CREATE TABLE IF NOT EXISTS BigTensors ('
                     'rowid INTEGER PRIMARY KEY, '
                     'customer_number INTEGER, '
                     'tag_id INTEGER NOT NULL, '
                     'step_count INTEGER NOT NULL, '
                     'tensor BLOB)')

EVENT_LOGS_TABLE = ('CREATE TABLE IF NOT EXISTS EventLogs ('
                    'rowid INTEGER PRIMARY KEY, '
                    'customer_number INTEGER, '
                    'run_id INTEGER NOT NULL, '
                    'event_log_id INTEGER, '
                    'path VARCHAR(1023) NOT NULL, '
                    'offset INTEGER NOT NULL)')

EXPERIMENTS_TABLE = ('CREATE TABLE IF NOT EXISTS Experiments ('
                     'customer_number INTEGER PRIMARY KEY, '
                     'experiment_id INTEGER, '
                     'name VARCHAR(500) NOT NULL, '
                     'description TEXT NOT NULL)')

PLUGINS_TABLE = ('CREATE TABLE IF NOT EXISTS Plugins ('
                 'plugin_id INTEGER PRIMARY KEY, '
                 'name VARCHAR(255) NOT NULL)')

RUNS_TABLE = ('CREATE TABLE IF NOT EXISTS Runs ('
              'rowid INTEGER PRIMARY KEY, '
              'customer_number INTEGER, '
              'experiment_id INTEGER NOT NULL, '
              'run_id INTEGER NOT NULL, '
              'name VARCHAR(1900) NOT NULL)')

TAGS_TABLE = ('CREATE TABLE IF NOT EXISTS Tags ('
              'rowid INTEGER PRIMARY KEY, '
              'customer_number INTEGER, '
              'run_id INTEGER NOT NULL, '
              'tag_id INTEGER NOT NULL, '
              'plugin_id INTEGER NOT NULL, '
              'name VARCHAR(500), '
              'display_name VARCHAR(500), '
              'summary_description TEXT)')

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
