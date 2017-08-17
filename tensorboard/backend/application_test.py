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
"""Unit tests for application package."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import functools
import json
import os
import shutil
import socket
import tempfile

import six
import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard import main as tensorboard
from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin


class FakePlugin(base_plugin.TBPlugin):
  """A plugin with no functionality."""

  def __init__(self, unused_context, plugin_name, is_active_value,
               routes_mapping):
    """Constructs a fake plugin.

    Args:
      plugin_name: The name of this plugin.
      is_active_value: Whether the plugin is active.
      routes_mapping: A dictionary mapping from route (string URL path) to the
        method called when a user issues a request to that route.
    """
    self.plugin_name = plugin_name
    self._is_active_value = is_active_value
    self._routes_mapping = routes_mapping

  def get_plugin_apps(self):
    """Returns a mapping from routes to handlers offered by this plugin.

    Returns:
      A dictionary mapping from routes to handlers offered by this plugin.
    """
    return self._routes_mapping

  def is_active(self):
    """Returns whether this plugin is active.

    Returns:
      A boolean. Whether this plugin is active.
    """
    return self._is_active_value


class TensorboardServerTest(tf.test.TestCase):
  _only_use_meta_graph = False  # Server data contains only a GraphDef

  def setUp(self):
    plugins = [
        FakePlugin(
            None, plugin_name='foo', is_active_value=True, routes_mapping={}),
        FakePlugin(
            None, plugin_name='bar', is_active_value=False, routes_mapping={}),
    ]
    app = application.TensorBoardWSGI(plugins)
    self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

  def _get_json(self, path):
    response = self.server.get(path)
    self.assertEqual(200, response.status_code)
    self.assertEqual('application/json', response.headers.get('Content-Type'))
    return json.loads(response.get_data().decode('utf-8'))

  def testBasicStartup(self):
    """Start the server up and then shut it down immediately."""
    pass

  def testRequestNonexistentPage(self):
    """Request a page that doesn't exist; it should 404."""
    response = self.server.get('/asdf')
    self.assertEqual(404, response.status_code)

  def testPluginsListing(self):
    """Test the format of the data/plugins_listing endpoint."""
    parsed_object = self._get_json('/data/plugins_listing')
    # Plugin foo is active. Plugin bar is not.
    self.assertEqual(parsed_object, {'foo': True, 'bar': False})


class TensorboardServerPluginNameTest(tf.test.TestCase):

  def _test(self, name, should_be_okay):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self.addCleanup(shutil.rmtree, temp_dir)
    multiplexer = event_multiplexer.EventMultiplexer(
        size_guidance=application.DEFAULT_SIZE_GUIDANCE,
        purge_orphaned_data=True)
    plugins = [
        FakePlugin(
            None, plugin_name='foo', is_active_value=True, routes_mapping={}),
        FakePlugin(
            None, plugin_name=name, is_active_value=True, routes_mapping={}),
        FakePlugin(
            None, plugin_name='bar', is_active_value=False, routes_mapping={}),
    ]
    if should_be_okay:
      application.TensorBoardWSGIApp(
          temp_dir, plugins, multiplexer, reload_interval=0)
    else:
      with six.assertRaisesRegex(self, ValueError, r'invalid name'):
        application.TensorBoardWSGIApp(
            temp_dir, plugins, multiplexer, reload_interval=0)

  def testEmptyName(self):
    self._test('', False)

  def testNameWithSlashes(self):
    self._test('scalars/data', False)

  def testNameWithSpaces(self):
    self._test('my favorite plugin', False)

  def testSimpleName(self):
    self._test('scalars', True)

  def testComprehensiveName(self):
    self._test('Scalar-Dashboard_3000.1', True)


class TensorboardServerPluginRouteTest(tf.test.TestCase):

  def _test(self, route, should_be_okay):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self.addCleanup(shutil.rmtree, temp_dir)
    multiplexer = event_multiplexer.EventMultiplexer(
        size_guidance=application.DEFAULT_SIZE_GUIDANCE,
        purge_orphaned_data=True)
    plugins = [
        FakePlugin(
            None,
            plugin_name='foo',
            is_active_value=True,
            routes_mapping={route: lambda environ, start_response: None}),
    ]
    if should_be_okay:
      application.TensorBoardWSGIApp(
          temp_dir, plugins, multiplexer, reload_interval=0)
    else:
      with six.assertRaisesRegex(self, ValueError, r'invalid route'):
        application.TensorBoardWSGIApp(
            temp_dir, plugins, multiplexer, reload_interval=0)

  def testNormalRoute(self):
    self._test('/runs', True)

  def testEmptyRoute(self):
    self._test('', False)

  def testSlashlessRoute(self):
    self._test('runaway', False)


class TensorboardServerUsingMetagraphOnlyTest(TensorboardServerTest):
  # Tests new ability to use only the MetaGraphDef
  _only_use_meta_graph = True  # Server data contains only a MetaGraphDef


class ParseEventFilesSpecTest(tf.test.TestCase):

  def testRunName(self):
    logdir = 'lol:/cat'
    expected = {'/cat': 'lol'}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testPathWithColonThatComesAfterASlash_isNotConsideredARunName(self):
    logdir = '/lol:/cat'
    expected = {'/lol:/cat': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testMultipleDirectories(self):
    logdir = '/a,/b'
    expected = {'/a': None, '/b': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testNormalizesPaths(self):
    logdir = '/lol/.//cat/../cat'
    expected = {'/lol/cat': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testAbsolutifies(self):
    logdir = 'lol/cat'
    expected = {os.path.realpath('lol/cat'): None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testRespectsGCSPath(self):
    logdir = 'gs://foo/path'
    expected = {'gs://foo/path': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testRespectsHDFSPath(self):
    logdir = 'hdfs://foo/path'
    expected = {'hdfs://foo/path': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testDoesNotExpandUserInGCSPath(self):
    logdir = 'gs://~/foo/path'
    expected = {'gs://~/foo/path': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testDoesNotNormalizeGCSPath(self):
    logdir = 'gs://foo/./path//..'
    expected = {'gs://foo/./path//..': None}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testRunNameWithGCSPath(self):
    logdir = 'lol:gs://foo/path'
    expected = {'gs://foo/path': 'lol'}
    self.assertEqual(application.parse_event_files_spec(logdir), expected)


class TensorBoardPluginsTest(tf.test.TestCase):

  def testPluginsAdded(self):

    def foo_handler():
      pass

    def bar_handler():
      pass

    plugins = [
        functools.partial(
            FakePlugin,
            plugin_name='foo',
            is_active_value=True,
            routes_mapping={'/foo_route': foo_handler}),
        functools.partial(
            FakePlugin,
            plugin_name='bar',
            is_active_value=True,
            routes_mapping={'/bar_route': bar_handler}),
    ]

    # The application should have added routes for both plugins.
    app = application.standard_tensorboard_wsgi('', True, 60, plugins)

    # The routes are prefixed with /data/plugin/[plugin name].
    self.assertDictContainsSubset({
        '/data/plugin/foo/foo_route': foo_handler,
        '/data/plugin/bar/bar_route': bar_handler,
    }, app.data_applications)


class TensorboardSimpleServerConstructionTest(tf.test.TestCase):
  """Tests that the default HTTP server is constructed without error.

  Mostly useful for IPv4/IPv6 testing. This test should run with only IPv4, only
  IPv6, and both IPv4 and IPv6 enabled.
  """

  class _StubApplication(object):
    tag = ''

  def testMakeServerBlankHost(self):
    # Test that we can bind to all interfaces without throwing an error
    server, url = tensorboard.make_simple_server(
        self._StubApplication(),
        host='',
        port=0)  # Grab any available port
    self.assertTrue(server)
    self.assertTrue(url)

  def testSpecifiedHost(self):
    one_passed = False
    try:
      _, url = tensorboard.make_simple_server(
          self._StubApplication(),
          host='127.0.0.1',
          port=0)
      self.assertStartsWith(actual=url, expected_start='http://127.0.0.1:')
      one_passed = True
    except socket.error:
      # IPv4 is not supported
      pass
    try:
      _, url = tensorboard.make_simple_server(
          self._StubApplication(),
          host='::1',
          port=0)
      self.assertStartsWith(actual=url, expected_start='http://[::1]:')
      one_passed = True
    except socket.error:
      # IPv6 is not supported
      pass
    self.assertTrue(one_passed)  # We expect either IPv4 or IPv6 to be supported


class TensorBoardApplcationConstructionTest(tf.test.TestCase):

  def testExceptions(self):
    logdir = '/fake/foo'
    multiplexer = event_multiplexer.EventMultiplexer()

    # Fails if there is an unnamed plugin
    with self.assertRaises(ValueError):
      # This plugin lacks a name.
      plugins = [
          FakePlugin(
              None, plugin_name=None, is_active_value=True, routes_mapping={}),
      ]
      application.TensorBoardWSGIApp(logdir, plugins, multiplexer, 0)

    # Fails if there are two plugins with same name
    with self.assertRaises(ValueError):
      plugins = [
          FakePlugin(
              None, plugin_name='foo', is_active_value=True, routes_mapping={}),
          FakePlugin(
              None, plugin_name='foo', is_active_value=True, routes_mapping={}),
      ]
      application.TensorBoardWSGIApp(logdir, plugins, multiplexer, 0)


class DbTest(tf.test.TestCase):

  def testSqliteDb(self):
    db_uri = 'sqlite:' + os.path.join(self.get_temp_dir(), 'db')
    db_module, db_connection_provider = application.get_database_info(db_uri)
    self.assertTrue(hasattr(db_module, 'Date'))
    with contextlib.closing(db_connection_provider()) as conn:
      with conn:
        with contextlib.closing(conn.cursor()) as c:
          c.execute('create table peeps (name text)')
          c.execute('insert into peeps (name) values (?)', ('justine',))
    _, db_connection_provider = application.get_database_info(db_uri)
    with contextlib.closing(db_connection_provider()) as conn:
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select name from peeps')
        self.assertEqual(('justine',), c.fetchone())

  def testTransactionRollback(self):
    db_uri = 'sqlite:' + os.path.join(self.get_temp_dir(), 'db')
    _, db_connection_provider = application.get_database_info(db_uri)
    with contextlib.closing(db_connection_provider()) as conn:
      with conn:
        with contextlib.closing(conn.cursor()) as c:
          c.execute('create table peeps (name text)')
      try:
        with conn:
          with contextlib.closing(conn.cursor()) as c:
            c.execute('insert into peeps (name) values (?)', ('justine',))
          raise IOError('hi')
      except IOError:
        pass
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select name from peeps')
        self.assertIsNone(c.fetchone())

  def testTransactionRollback_doesntDoAnythingIfIsolationLevelIsNone(self):
    # NOTE: This is a terrible idea. Don't do this.
    db_uri = ('sqlite:' + os.path.join(self.get_temp_dir(), 'db') +
              '?isolation_level=null')
    _, db_connection_provider = application.get_database_info(db_uri)
    with contextlib.closing(db_connection_provider()) as conn:
      with conn:
        with contextlib.closing(conn.cursor()) as c:
          c.execute('create table peeps (name text)')
      try:
        with conn:
          with contextlib.closing(conn.cursor()) as c:
            c.execute('insert into peeps (name) values (?)', ('justine',))
          raise IOError('hi')
      except IOError:
        pass
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select name from peeps')
        self.assertEqual(('justine',), c.fetchone())

  def testSqliteUriErrors(self):
    with self.assertRaises(ValueError):
      application.create_sqlite_connection_provider("lol:cat")
    with self.assertRaises(ValueError):
      application.create_sqlite_connection_provider("sqlite::memory:")
    with self.assertRaises(ValueError):
      application.create_sqlite_connection_provider("sqlite://foo.example/bar")


if __name__ == '__main__':
  tf.test.main()
