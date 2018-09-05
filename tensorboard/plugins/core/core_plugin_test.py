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
# ==============================================================================
"""Tests the TensorBoard core endpoints."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json
import os
import shutil
import sqlite3

import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin


class CorePluginTest(tf.test.TestCase):
  _only_use_meta_graph = False  # Server data contains only a GraphDef

  def setUp(self):
    super(CorePluginTest, self).setUp()
    self.temp_dir = self.get_temp_dir()
    self.addCleanup(shutil.rmtree, self.temp_dir)
    self.db_path = os.path.join(self.temp_dir, 'db.db')
    self.db = sqlite3.connect(self.db_path)
    self.db_uri = 'sqlite:' + self.db_path
    self._start_logdir_based_server(self.temp_dir)
    self._start_db_based_server()

  def testRoutesProvided(self):
    """Tests that the plugin offers the correct routes."""
    routes = self.logdir_based_plugin.get_plugin_apps()
    self.assertIsInstance(routes['/data/logdir'], collections.Callable)
    self.assertIsInstance(routes['/data/runs'], collections.Callable)

  def testIndex_returnsActualHtml(self):
    """Test the format of the /data/runs endpoint."""
    response = self.logdir_based_server.get('/')
    self.assertEqual(200, response.status_code)
    self.assertStartsWith(response.headers.get('Content-Type'), 'text/html')
    html = response.get_data()
    self.assertStartsWith(html, b'<!doctype html>')

  def testDataPaths_disableAllCaching(self):
    """Test the format of the /data/runs endpoint."""
    for path in ('/data/runs', '/data/logdir'):
      response = self.logdir_based_server.get(path)
      self.assertEqual(200, response.status_code, msg=path)
      self.assertEqual('0', response.headers.get('Expires'), msg=path)

  def testEnvironmentForDbUri(self):
    """Test that the environment route correctly returns the database URI."""
    parsed_object = self._get_json(self.db_based_server, '/data/environment')
    self.assertEqual(parsed_object['data_location'], self.db_uri)

  def testEnvironmentForLogdir(self):
    """Test that the environment route correctly returns the logdir."""
    parsed_object = self._get_json(
        self.logdir_based_server, '/data/environment')
    self.assertEqual(parsed_object['data_location'], self.logdir)

  def testEnvironmentForModeForDbServer(self):
    """Tests environment route that returns the mode for db based server."""
    parsed_object = self._get_json(self.db_based_server, '/data/environment')
    self.assertEqual(parsed_object['mode'], 'db')

  def testEnvironmentForModeForLogServer(self):
    """Tests environment route that returns the mode for logdir based server."""
    parsed_object = self._get_json(
        self.logdir_based_server, '/data/environment')
    self.assertEqual(parsed_object['mode'], 'logdir')

  def testEnvironmentForWindowTitle(self):
    """Test that the environment route correctly returns the window title."""
    parsed_object_db = self._get_json(
        self.db_based_server, '/data/environment')
    parsed_object_logdir = self._get_json(
        self.logdir_based_server, '/data/environment')
    self.assertEqual(
        parsed_object_db['window_title'], parsed_object_logdir['window_title'])
    self.assertEqual(parsed_object_db['window_title'], 'title foo')

  def testLogdir(self):
    """Test the format of the data/logdir endpoint."""
    parsed_object = self._get_json(self.logdir_based_server, '/data/logdir')
    self.assertEqual(parsed_object, {'logdir': self.logdir})

  def testRuns(self):
    """Test the format of the /data/runs endpoint."""
    self._add_run('run1')
    run_json = self._get_json(self.db_based_server, '/data/runs')
    self.assertEqual(run_json, ['run1'])
    run_json = self._get_json(self.logdir_based_server, '/data/runs')
    self.assertEqual(run_json, ['run1'])

  def testExperiments(self):
    """Test the format of the /data/experiments endpoint."""
    self._add_run('run1', experiment_name = 'exp1')
    self._add_run('run2', experiment_name = 'exp1')
    self._add_run('run3', experiment_name = 'exp2')

    [exp1, exp2] = self._get_json(self.db_based_server, '/data/experiments')
    self.assertEqual(exp1.get('name'), 'exp1')
    self.assertEqual(exp2.get('name'), 'exp2')

    exp_json = self._get_json(self.logdir_based_server, '/data/experiments')
    self.assertEqual(exp_json, [])

  def testExperimentRuns(self):
    """Test the format of the /data/experiment_runs endpoint."""
    self._add_run('run1', experiment_name = 'exp1')
    self._add_run('run2', experiment_name = 'exp1')
    self._add_run('run3', experiment_name = 'exp2')

    [exp1, exp2] = self._get_json(self.db_based_server, '/data/experiments')

    exp1_runs = self._get_json(self.db_based_server,
        '/data/experiment_runs?experiment=%s' % exp1.get('id'))
    self.assertEqual(len(exp1_runs), 2);
    self.assertEqual(exp1_runs[0].get('name'), 'run1');
    self.assertEqual(exp1_runs[1].get('name'), 'run2');
    self.assertEqual(len(exp1_runs[0].get('tags')), 1);
    self.assertEqual(exp1_runs[0].get('tags')[0].get('name'), 'mytag');
    self.assertEqual(len(exp1_runs[1].get('tags')), 1);
    self.assertEqual(exp1_runs[1].get('tags')[0].get('name'), 'mytag');

    exp2_runs = self._get_json(self.db_based_server,
        '/data/experiment_runs?experiment=%s' % exp2.get('id'))
    self.assertEqual(len(exp2_runs), 1);
    self.assertEqual(exp2_runs[0].get('name'), 'run3');

    # TODO(stephanwlee): Write test on runs that do not have any tag.

    exp_json = self._get_json(self.logdir_based_server, '/data/experiments')
    self.assertEqual(exp_json, [])


  def testRunsAppendOnly(self):
    """Test that new runs appear after old ones in /data/runs."""
    fake_wall_times = {
        'run1': 1234.0,
        'avocado': 2345.0,
        'zebra': 3456.0,
        'ox': 4567.0,
        'mysterious': None,
        'enigmatic': None,
    }

    stubs = tf.test.StubOutForTesting()
    def FirstEventTimestamp_stub(multiplexer_self, run_name):
      del multiplexer_self
      matches = [candidate_name
                 for candidate_name in fake_wall_times
                 if run_name.endswith(candidate_name)]
      self.assertEqual(len(matches), 1, '%s (%s)' % (matches, run_name))
      wall_time = fake_wall_times[matches[0]]
      if wall_time is None:
        raise ValueError('No event timestamp could be found')
      else:
        return wall_time

    stubs.SmartSet(self.multiplexer,
                   'FirstEventTimestamp',
                   FirstEventTimestamp_stub)

    # Start with a single run.
    self._add_run('run1')

    # Add one run: it should come last.
    self._add_run('avocado')
    self.assertEqual(self._get_json(self.db_based_server, '/data/runs'),
                     ['run1', 'avocado'])
    self.assertEqual(self._get_json(self.logdir_based_server, '/data/runs'),
                     ['run1', 'avocado'])

    # Add another run: it should come last, too.
    self._add_run('zebra')
    self.assertEqual(self._get_json(self.db_based_server, '/data/runs'),
                     ['run1', 'avocado', 'zebra'])
    self.assertEqual(self._get_json(self.logdir_based_server, '/data/runs'),
                     ['run1', 'avocado', 'zebra'])

    # And maybe there's a run for which we somehow have no timestamp.
    self._add_run('mysterious')
    with self.db:
      self.db.execute('UPDATE Runs SET started_time=NULL WHERE run_name=?',
                      ['mysterious'])
    self.assertEqual(self._get_json(self.db_based_server, '/data/runs'),
                     ['run1', 'avocado', 'zebra', 'mysterious'])
    self.assertEqual(self._get_json(self.logdir_based_server, '/data/runs'),
                     ['run1', 'avocado', 'zebra', 'mysterious'])

    # Add another timestamped run: it should come before the timestamp-less one.
    self._add_run('ox')
    self.assertEqual(self._get_json(self.db_based_server, '/data/runs'),
                     ['run1', 'avocado', 'zebra', 'ox', 'mysterious'])
    self.assertEqual(self._get_json(self.logdir_based_server, '/data/runs'),
                     ['run1', 'avocado', 'zebra', 'ox', 'mysterious'])

    # Add another timestamp-less run, lexicographically before the other one:
    # it should come after all timestamped runs but first among timestamp-less.
    self._add_run('enigmatic')
    with self.db:
      self.db.execute('UPDATE Runs SET started_time=NULL WHERE run_name=?',
                      ['enigmatic'])
    self.assertEqual(
        self._get_json(self.db_based_server, '/data/runs'),
        ['run1', 'avocado', 'zebra', 'ox', 'enigmatic', 'mysterious'])
    self.assertEqual(
        self._get_json(self.logdir_based_server, '/data/runs'),
        ['run1', 'avocado', 'zebra', 'ox', 'enigmatic', 'mysterious'])

    stubs.CleanUp()

  def _start_logdir_based_server(self, temp_dir):
    self.logdir = temp_dir
    self.multiplexer = event_multiplexer.EventMultiplexer(
        size_guidance=application.DEFAULT_SIZE_GUIDANCE,
        purge_orphaned_data=True)
    context = base_plugin.TBContext(
        assets_zip_provider=get_test_assets_zip_provider(),
        logdir=self.logdir,
        multiplexer=self.multiplexer,
        window_title='title foo')
    self.logdir_based_plugin = core_plugin.CorePlugin(context)
    app = application.TensorBoardWSGIApp(
        self.logdir,
        [self.logdir_based_plugin],
        self.multiplexer,
        0,
        path_prefix='')
    self.logdir_based_server = werkzeug_test.Client(app, wrappers.BaseResponse)

  def _start_db_based_server(self):
    db_module, db_connection_provider = application.get_database_info(
        self.db_uri)
    context = base_plugin.TBContext(
        assets_zip_provider=get_test_assets_zip_provider(),
        db_module=db_module,
        db_connection_provider=db_connection_provider,
        db_uri=self.db_uri,
        window_title='title foo')
    self.db_based_plugin = core_plugin.CorePlugin(context)
    app = application.TensorBoardWSGI([self.db_based_plugin])
    self.db_based_server = werkzeug_test.Client(app, wrappers.BaseResponse)

  def _add_run(self, run_name, experiment_name='experiment'):
    self._generate_test_data(run_name, experiment_name)
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    self.multiplexer.Reload()

  def _get_json(self, server, path):
    response = server.get(path)
    self.assertEqual(200, response.status_code)
    return self._get_json_payload(response)

  def _get_json_payload(self, response):
    self.assertStartsWith(response.headers.get('Content-Type'),
                          'application/json')
    return json.loads(response.get_data().decode('utf-8'))

  def _generate_test_data(self, run_name, experiment_name):
    """Generates the test data directory.

    The test data has a single run of the given name, containing:
      - a graph definition and metagraph definition

    Arguments:
      run_name: The directory under self.logdir into which to write
          events.
    """
    run_path = os.path.join(self.logdir, run_name)
    writer = tf.summary.FileWriter(run_path)

    # Add a simple graph event.
    graph_def = tf.GraphDef()
    node1 = graph_def.node.add()
    node1.name = 'a'
    node2 = graph_def.node.add()
    node2.name = 'b'
    node2.attr['very_large_attr'].s = b'a' * 2048  # 2 KB attribute

    meta_graph_def = tf.MetaGraphDef(graph_def=graph_def)

    if self._only_use_meta_graph:
      writer.add_meta_graph(meta_graph_def)
    else:
      writer.add_graph(graph_def)

    writer.flush()
    writer.close()

    # Write data for the run to the database.
    # TODO(nickfelt): Figure out why reseting the graph is necessary.
    tf.reset_default_graph()
    db_writer = tf.contrib.summary.create_db_writer(
        db_uri=self.db_path,
        experiment_name=experiment_name,
        run_name=run_name,
        user_name='user')
    with db_writer.as_default(), tf.contrib.summary.always_record_summaries():
      tf.contrib.summary.scalar('mytag', 1)

    with tf.Session() as sess:
      sess.run(tf.global_variables_initializer())
      sess.run(tf.contrib.summary.summary_writer_initializer_op())
      sess.run(tf.contrib.summary.all_summary_ops())


class CorePluginUsingMetagraphOnlyTest(CorePluginTest):
  # Tests new ability to use only the MetaGraphDef
  _only_use_meta_graph = True  # Server data contains only a MetaGraphDef


def get_test_assets_zip_provider():
  path = os.path.join(tf.resource_loader.get_data_files_path(),
                      'test_webfiles.zip')
  if not os.path.exists(path):
    tf.logging.warning('test_webfiles.zip static assets not found: %s', path)
    return None
  return lambda: open(path, 'rb')


if __name__ == '__main__':
  tf.test.main()
