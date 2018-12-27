# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
# ==============================================================================

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import os.path
import sqlite3

from tensorboard.backend.event_processing import db_import_multiplexer
from tensorboard.compat.proto import event_pb2
from tensorboard.util import tensor_util
from tensorboard.util import test_util
import tensorflow as tf

tf.compat.v1.disable_v2_behavior()


def add_event(path):
  with test_util.FileWriterCache.get(path) as writer:
    event = event_pb2.Event()
    event.summary.value.add(tag='tag', tensor=tensor_util.make_tensor_proto(1))
    writer.add_event(event)


class DbImportMultiplexerTest(tf.test.TestCase):

  def setUp(self):
    super(DbImportMultiplexerTest, self).setUp()

    db_file_name = os.path.join(self.get_temp_dir(), 'db')
    self.db_connection_provider = lambda: sqlite3.connect(db_file_name)
    self.multiplexer = db_import_multiplexer.DbImportMultiplexer(
        db_connection_provider=self.db_connection_provider,
        purge_orphaned_data=False,
        max_reload_threads=1,
        use_import_op=False)

  def _get_runs(self):
    db = self.db_connection_provider()
    cursor = db.execute('''
      SELECT
        Runs.run_name
      FROM Runs
    	ORDER BY Runs.run_name
    ''')
    return [row[0] for row in cursor]

  def _get_experiments(self):
    db = self.db_connection_provider()
    cursor = db.execute('''
      SELECT
        Experiments.experiment_name
      FROM Experiments
      ORDER BY Experiments.experiment_name
    ''')
    return [row[0] for row in cursor]

  def test_init(self):
    """Tests that DB schema is created when creating DbImportMultiplexer."""
    # Reading DB before schema initialization raises.
    self.assertEqual(self._get_experiments(), [])
    self.assertEqual(self._get_runs(), [])

  def test_empty_folder(self):
    fake_dir = os.path.join(self.get_temp_dir(), 'fake_dir')
    self.multiplexer.AddRunsFromDirectory(fake_dir)
    self.assertEqual(self._get_experiments(), [])
    self.assertEqual(self._get_runs(), [])

  def test_flat(self):
    path = self.get_temp_dir()
    add_event(path)
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    # Because we added runs from `path`, there is no folder to infer experiment
    # and run names from.
    self.assertEqual(self._get_experiments(), [u'.'])
    self.assertEqual(self._get_runs(), [u'.'])

  def test_single_level(self):
    path = self.get_temp_dir()
    add_event(os.path.join(path, 'exp1'))
    add_event(os.path.join(path, 'exp2'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._get_experiments(), [u'exp1', u'exp2'])
    # Run names are '.'. because we already used the directory name for
    # inferring experiment name. There are two items with the same name but
    # with different ids.
    self.assertEqual(self._get_runs(), [u'.', u'.'])

  def test_double_level(self):
    path = self.get_temp_dir()
    add_event(os.path.join(path, 'exp1', 'test'))
    add_event(os.path.join(path, 'exp1', 'train'))
    add_event(os.path.join(path, 'exp2', 'test'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._get_experiments(), [u'exp1', u'exp2'])
    # There are two items with the same name but with different ids.
    self.assertEqual(self._get_runs(), [u'test', u'test', u'train'])

  def test_mixed_levels(self):
    # Mixture of root and single levels.
    path = self.get_temp_dir()
    # Train is in the root directory.
    add_event(os.path.join(path))
    add_event(os.path.join(path, 'eval'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._get_experiments(), [u'.', u'eval'])
    self.assertEqual(self._get_runs(), [u'.', u'.'])

  def test_deep(self):
    path = self.get_temp_dir()
    add_event(os.path.join(path, 'exp1', 'run1', 'bar', 'train'))
    add_event(os.path.join(path, 'exp2', 'run1', 'baz', 'train'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._get_experiments(), [u'exp1', u'exp2'])
    self.assertEqual(self._get_runs(), [os.path.join('run1', 'bar', 'train'),
                                        os.path.join('run1', 'baz', 'train')])

  def test_manual_name(self):
    path1 = os.path.join(self.get_temp_dir(), 'foo')
    path2 = os.path.join(self.get_temp_dir(), 'bar')
    add_event(os.path.join(path1, 'some', 'nested', 'name'))
    add_event(os.path.join(path2, 'some', 'nested', 'name'))
    self.multiplexer.AddRunsFromDirectory(path1, 'name1')
    self.multiplexer.AddRunsFromDirectory(path2, 'name2')
    self.multiplexer.Reload()
    self.assertEqual(self._get_experiments(), [u'name1', u'name2'])
    # Run name ignored 'foo' and 'bar' on 'foo/some/nested/name' and
    # 'bar/some/nested/name', respectively.
    # There are two items with the same name but with different ids.
    self.assertEqual(self._get_runs(), [os.path.join('some', 'nested', 'name'),
                                        os.path.join('some', 'nested', 'name')])


if __name__ == '__main__':
  tf.test.main()
