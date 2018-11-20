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
import shutil

from tensorboard.backend.event_processing import db_import_multiplexer
from tensorboard.backend import application
import tensorflow as tf


# A simple event with a summary that contains a single TensorProto of int32.
RECORD = (b'\x0b\x00\x00\x00\x00\x00\x00\x00\x86\x15\xf5\x04*\t\n\x07B'
          b'\x05\x08\x03:\x01\x01\x85\xb2\x08\x9c')

def _AddEvents(path):
  if not tf.gfile.IsDirectory(path):
    tf.gfile.MakeDirs(path)
  fpath = os.path.join(path, 'hypothetical.tfevents.out')
  with tf.gfile.GFile(fpath, 'w') as f:
    f.write(RECORD)
    return fpath


class DbImportMultiplexerTest(tf.test.TestCase):

  def setUp(self):
    super(DbImportMultiplexerTest, self).setUp()

    db_uri = 'sqlite:%s/db' % (self.get_temp_dir())
    _, self.db_connection_provider = application.get_database_info(db_uri)
    self.multiplexer = db_import_multiplexer.DbImportMultiplexer(
        db_connection_provider=self.db_connection_provider,
        purge_orphaned_data=False,
        max_reload_threads=1,
        use_import_op=False)

  def _getRuns(self):
    db = self.db_connection_provider()
    cursor = db.execute('''
      SELECT
        Runs.run_name
      FROM Runs
    	ORDER BY Runs.run_name
    ''')
    return [row[0] for row in cursor]

  def _getExperiments(self):
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
    self.assertEqual(self._getExperiments(), [])
    self.assertEqual(self._getRuns(), [])

  def testAddRunsFromDirectory_empty_folder(self):
    fake_dir = os.path.join(self.get_temp_dir(), 'fake_dir')
    self.multiplexer.AddRunsFromDirectory(fake_dir)
    self.assertEqual(self._getExperiments(), [])
    self.assertEqual(self._getRuns(), [])

  def testAddRunsFromDirectory_flat(self):
    path = self.get_temp_dir()
    _AddEvents(path)
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    # Because we added runs from `path`, there is no folder to infer experiment
    # and run names from.
    self.assertEqual(self._getExperiments(), [u'.'])
    self.assertEqual(self._getRuns(), [u'.'])

  def testAddRunsFromDirectory_single_level(self):
    path = self.get_temp_dir()
    _AddEvents(os.path.join(path, 'exp1'))
    _AddEvents(os.path.join(path, 'exp2'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._getExperiments(), [u'exp1', u'exp2'])
    # Run names are '.'. because we already used the directory name for
    # inferring experiment name. There are two items with the same name but
    # with different ids.
    self.assertEqual(self._getRuns(), [u'.', u'.'])

  def testAddRunsFromDirectory_double_level(self):
    path = self.get_temp_dir()
    _AddEvents(os.path.join(path, 'exp1/test'))
    _AddEvents(os.path.join(path, 'exp1/train'))
    _AddEvents(os.path.join(path, 'exp2/test'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._getExperiments(), [u'exp1', u'exp2'])
    # There are two items with the same name but with different ids.
    self.assertEqual(self._getRuns(), [u'test', u'test', u'train'])

  def testAddRunsFromDirectory_deep(self):
    path = self.get_temp_dir()
    _AddEvents(os.path.join(path, 'exp1/run1/foo/bar/train'))
    _AddEvents(os.path.join(path, 'exp2/run1/foo/baz/train'))
    self.multiplexer.AddRunsFromDirectory(path)
    self.multiplexer.Reload()
    self.assertEqual(self._getExperiments(), [u'exp1', u'exp2'])
    self.assertEqual(self._getRuns(), [u'run1/foo/bar/train',
                                       u'run1/foo/baz/train'])

  def testAddRunsFromDirectory_manual_name(self):
    path1 = os.path.join(self.get_temp_dir(), 'foo')
    path2 = os.path.join(self.get_temp_dir(), 'bar')
    _AddEvents(os.path.join(path1, 'some/nested/name'))
    _AddEvents(os.path.join(path2, 'some/nested/name'))
    self.multiplexer.AddRunsFromDirectory(path1, 'name1')
    self.multiplexer.AddRunsFromDirectory(path2, 'name2')
    self.multiplexer.Reload()
    self.assertEqual(self._getExperiments(), [u'name1', u'name2'])
    # Run name ignored 'foo' and 'bar' on 'foo/some/nested/name' and
    # 'bar/some/nested/name', respectively.
    # There are two items with the same name but with different ids.
    self.assertEqual(self._getRuns(), [u'some/nested/name',
                                       u'some/nested/name'])


if __name__ == '__main__':
  tf.test.main()
