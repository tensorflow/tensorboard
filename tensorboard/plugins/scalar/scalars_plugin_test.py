# -*- coding: utf-8 -*-
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
"""Integration tests for the Scalars Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import collections
import csv
import functools
import os.path

from six import StringIO
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard import errors
from tensorboard.backend import application
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.scalar import metadata
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.scalar import summary
from tensorboard.util import test_util


tf.compat.v1.enable_eager_execution()


class ScalarsPluginTest(tf.test.TestCase):

  _STEPS = 9

  _LEGACY_SCALAR_TAG = 'ancient-values'
  _SCALAR_TAG = 'simple-values'
  _HISTOGRAM_TAG = 'complicated-values'

  _DISPLAY_NAME = 'Walrus population'
  _DESCRIPTION = 'the *most* valuable statistic'
  _HTML_DESCRIPTION = '<p>the <em>most</em> valuable statistic</p>'

  _RUN_WITH_LEGACY_SCALARS = '_RUN_WITH_LEGACY_SCALARS'
  _RUN_WITH_SCALARS = '_RUN_WITH_SCALARS'
  _RUN_WITH_HISTOGRAM = '_RUN_WITH_HISTOGRAM'

  def __init__(self, *args, **kwargs):
    super(ScalarsPluginTest, self).__init__(*args, **kwargs)
    self.plugin = None  # used by DB tests only

  def load_runs(self, run_names):
    logdir = self.get_temp_dir()
    for run_name in run_names:
      self.generate_run(logdir, run_name)
    multiplexer = event_multiplexer.EventMultiplexer(size_guidance={
        # don't truncate my test data, please
        event_accumulator.TENSORS: self._STEPS,
    })
    multiplexer.AddRunsFromDirectory(logdir)
    multiplexer.Reload()
    return (logdir, multiplexer)

  def set_up_db(self):
    self.db_path = os.path.join(self.get_temp_dir(), 'db.db')
    self.db_uri = 'sqlite:' + self.db_path
    db_connection_provider = application.create_sqlite_connection_provider(
        self.db_uri)
    context = base_plugin.TBContext(
        db_connection_provider=db_connection_provider,
        db_uri=self.db_uri)
    self.core_plugin = core_plugin.CorePlugin(context)
    self.plugin = scalars_plugin.ScalarsPlugin(context)

  def generate_run_to_db(self, experiment_name, run_name):
    # This method uses `tf.contrib.summary`, and so must only be invoked
    # when TensorFlow 1.x is installed.
    tf.compat.v1.reset_default_graph()
    with tf.compat.v1.Graph().as_default():
      global_step = tf.compat.v1.placeholder(tf.int64)
      db_writer = tf.contrib.summary.create_db_writer(
          db_uri=self.db_path,
          experiment_name=experiment_name,
          run_name=run_name,
          user_name='user')
      with db_writer.as_default(), tf.contrib.summary.always_record_summaries():
        tf.contrib.summary.scalar(self._SCALAR_TAG, 42, step=global_step)
        flush_op = tf.contrib.summary.flush(db_writer._resource)
      with tf.compat.v1.Session() as sess:
        sess.run(tf.contrib.summary.summary_writer_initializer_op())
        summaries = tf.contrib.summary.all_summary_ops()
        for step in xrange(self._STEPS):
          feed_dict = {global_step: step}
          sess.run(summaries, feed_dict=feed_dict)
        sess.run(flush_op)

  def with_runs(run_names):
    """Run a test with a bare multiplexer and with a `data_provider`.

    The decorated function will receive an initialized `ScalarsPlugin`
    object as its first positional argument.
    """
    def decorator(fn):
      @functools.wraps(fn)
      def wrapper(self, *args, **kwargs):
        (logdir, multiplexer) = self.load_runs(run_names)
        with self.subTest('bare multiplexer'):
          ctx = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
          fn(self, scalars_plugin.ScalarsPlugin(ctx), *args, **kwargs)
        with self.subTest('generic data provider'):
          flags = argparse.Namespace(generic_data='true')
          provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
          ctx = base_plugin.TBContext(
              flags=flags,
              logdir=logdir,
              multiplexer=multiplexer,
              data_provider=provider,
          )
          fn(self, scalars_plugin.ScalarsPlugin(ctx), *args, **kwargs)
      return wrapper
    return decorator

  def generate_run(self, logdir, run_name):
    subdir = os.path.join(logdir, run_name)
    with test_util.FileWriterCache.get(subdir) as writer:
      for step in xrange(self._STEPS):
        data = [1 + step, 2 + step, 3 + step]
        if run_name == self._RUN_WITH_LEGACY_SCALARS:
          summ = tf.compat.v1.summary.scalar(
              self._LEGACY_SCALAR_TAG, tf.reduce_mean(data),
          ).numpy()
        elif run_name == self._RUN_WITH_SCALARS:
          summ = summary.op(
              self._SCALAR_TAG,
              tf.reduce_sum(data),
              display_name=self._DISPLAY_NAME,
              description=self._DESCRIPTION,
          ).numpy()
        elif run_name == self._RUN_WITH_HISTOGRAM:
          summ = tf.compat.v1.summary.histogram(
              self._HISTOGRAM_TAG, data
          ).numpy()
        else:
          assert False, 'Invalid run name: %r' % run_name
        writer.add_summary(summ, global_step=step)

  @with_runs([])
  def testRoutesProvided(self, plugin):
    """Tests that the plugin offers the correct routes."""
    routes = plugin.get_plugin_apps()
    self.assertIsInstance(routes['/scalars'], collections.Callable)
    self.assertIsInstance(routes['/tags'], collections.Callable)

  @with_runs([_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM])
  def test_index(self, plugin):
    self.assertEqual({
        self._RUN_WITH_LEGACY_SCALARS: {
            self._LEGACY_SCALAR_TAG: {
                'displayName': self._LEGACY_SCALAR_TAG,
                'description': '',
            },
        },
        self._RUN_WITH_SCALARS: {
            '%s/scalar_summary' % self._SCALAR_TAG: {
                'displayName': self._DISPLAY_NAME,
                'description': self._HTML_DESCRIPTION,
            },
        },
        # _RUN_WITH_HISTOGRAM omitted: No scalar data.
    }, plugin.index_impl())

  @with_runs([_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM])
  def _test_scalars_json(self, plugin, run_name, tag_name, should_work=True):
    if should_work:
      (data, mime_type) = plugin.scalars_impl(
          tag_name, run_name, None, scalars_plugin.OutputFormat.JSON)
      self.assertEqual('application/json', mime_type)
      self.assertEqual(len(data), self._STEPS)
    else:
      with self.assertRaises(errors.NotFoundError):
        plugin.scalars_impl(
            self._SCALAR_TAG, run_name, None, scalars_plugin.OutputFormat.JSON
        )

  @with_runs([_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM])
  def _test_scalars_csv(self, plugin, run_name, tag_name, should_work=True):
    if should_work:
      (data, mime_type) = plugin.scalars_impl(
          tag_name, run_name, None, scalars_plugin.OutputFormat.CSV)
      self.assertEqual('text/csv', mime_type)
      s = StringIO(data)
      reader = csv.reader(s)
      self.assertEqual(['Wall time', 'Step', 'Value'], next(reader))
      self.assertEqual(len(list(reader)), self._STEPS)
    else:
      with self.assertRaises(errors.NotFoundError):
        plugin.scalars_impl(
            self._SCALAR_TAG, run_name, None, scalars_plugin.OutputFormat.CSV
        )

  def test_scalars_json_with_legacy_scalars(self):
    self._test_scalars_json(self._RUN_WITH_LEGACY_SCALARS,
                            self._LEGACY_SCALAR_TAG)

  def test_scalars_json_with_scalars(self):
    self._test_scalars_json(self._RUN_WITH_SCALARS,
                            '%s/scalar_summary' % self._SCALAR_TAG)

  def test_scalars_json_with_histogram(self):
    self._test_scalars_json(self._RUN_WITH_HISTOGRAM, self._HISTOGRAM_TAG,
                            should_work=False)

  def test_scalars_csv_with_legacy_scalars(self):
    self._test_scalars_csv(self._RUN_WITH_LEGACY_SCALARS,
                           self._LEGACY_SCALAR_TAG)

  def test_scalars_csv_with_scalars(self):
    self._test_scalars_csv(self._RUN_WITH_SCALARS,
                           '%s/scalar_summary' % self._SCALAR_TAG)

  def test_scalars_csv_with_histogram(self):
    self._test_scalars_csv(self._RUN_WITH_HISTOGRAM, self._HISTOGRAM_TAG,
                           should_work=False)

  @with_runs([_RUN_WITH_LEGACY_SCALARS])
  def test_active_with_legacy_scalars(self, plugin):
    self.assertTrue(plugin.is_active())

  @with_runs([_RUN_WITH_SCALARS])
  def test_active_with_scalars(self, plugin):
    self.assertTrue(plugin.is_active())

  @with_runs([_RUN_WITH_HISTOGRAM])
  def test_active_with_histogram(self, plugin):
    if plugin._data_provider:
      # Hack, for now.
      self.assertTrue(plugin.is_active())
    else:
      self.assertFalse(plugin.is_active())

  @with_runs([_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM])
  def test_active_with_all(self, plugin):
    self.assertTrue(plugin.is_active())

  @test_util.run_v1_only('Requires contrib for db writer')
  def test_scalars_db_without_exp(self):
    self.set_up_db()
    self.generate_run_to_db('exp1', self._RUN_WITH_SCALARS)

    (data, mime_type) = self.plugin.scalars_impl(
        self._SCALAR_TAG, self._RUN_WITH_SCALARS, None,
        scalars_plugin.OutputFormat.JSON)
    self.assertEqual('application/json', mime_type)
    # When querying DB-based backend without an experiment id, it returns all
    # scalars without an experiment id. Such scalar can only be generated using
    # raw SQL queries though.
    self.assertEqual(len(data), 0)

  @test_util.run_v1_only('Requires contrib for db writer')
  def test_scalars_db_filter_by_experiment(self):
    self.set_up_db()
    self.generate_run_to_db('exp1', self._RUN_WITH_SCALARS)
    all_exps = self.core_plugin.list_experiments_impl()
    exp1 = next((x for x in all_exps if x.get('name') == 'exp1'), {})

    (data, mime_type) = self.plugin.scalars_impl(
        self._SCALAR_TAG, self._RUN_WITH_SCALARS, exp1.get('id'),
        scalars_plugin.OutputFormat.JSON)
    self.assertEqual('application/json', mime_type)
    self.assertEqual(len(data), self._STEPS)

  @test_util.run_v1_only('Requires contrib for db writer')
  def test_scalars_db_no_match(self):
    self.set_up_db()
    self.generate_run_to_db('exp1', self._RUN_WITH_SCALARS)

    # experiment_id is a number but we passed a string here.
    (data, mime_type) = self.plugin.scalars_impl(
        self._SCALAR_TAG, self._RUN_WITH_SCALARS, 'random_exp_id',
        scalars_plugin.OutputFormat.JSON)
    self.assertEqual('application/json', mime_type)
    self.assertEqual(len(data), 0)

if __name__ == '__main__':
  tf.test.main()
