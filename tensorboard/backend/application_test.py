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

try:
  # python version >= 3.3
  from unittest import mock
except ImportError:
  import mock

import posixpath
import ntpath

import six
import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin


class FakeFlags(object):
  def __init__(
      self,
      logdir,
      purge_orphaned_data=True,
      reload_interval=60,
      samples_per_plugin='',
      max_reload_threads=1,
      reload_task='auto',
      db='',
      db_import=False,
      db_import_use_op=False,
      window_title='',
      path_prefix=''):
    self.logdir = logdir
    self.purge_orphaned_data = purge_orphaned_data
    self.reload_interval = reload_interval
    self.samples_per_plugin = samples_per_plugin
    self.max_reload_threads = max_reload_threads
    self.reload_task = reload_task
    self.db = db
    self.db_import = db_import
    self.db_import_use_op = db_import_use_op
    self.window_title = window_title
    self.path_prefix = path_prefix


class FakePlugin(base_plugin.TBPlugin):
  """A plugin with no functionality."""

  def __init__(self,
               context,
               plugin_name,
               is_active_value,
               routes_mapping,
               construction_callback=None):
    """Constructs a fake plugin.

    Args:
      context: The TBContext magic container. Contains properties that are
        potentially useful to this plugin.
      plugin_name: The name of this plugin.
      is_active_value: Whether the plugin is active.
      routes_mapping: A dictionary mapping from route (string URL path) to the
        method called when a user issues a request to that route.
      construction_callback: An optional callback called when the plugin is
        constructed. The callback is passed the TBContext.
    """
    self.plugin_name = plugin_name
    self._is_active_value = is_active_value
    self._routes_mapping = routes_mapping

    if construction_callback:
      construction_callback(context)

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


class ApplicationTest(tf.test.TestCase):
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


class ApplicationBaseUrlTest(tf.test.TestCase):
  path_prefix = '/test'
  def setUp(self):
    plugins = [
        FakePlugin(
            None, plugin_name='foo', is_active_value=True, routes_mapping={}),
        FakePlugin(
            None, plugin_name='bar', is_active_value=False, routes_mapping={}),
    ]
    app = application.TensorBoardWSGI(plugins, path_prefix=self.path_prefix)
    self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

  def _get_json(self, path):
    response = self.server.get(path)
    self.assertEqual(200, response.status_code)
    self.assertEqual('application/json', response.headers.get('Content-Type'))
    return json.loads(response.get_data().decode('utf-8'))

  def testBaseUrlRequest(self):
    """Request a page that doesn't exist; it should 404."""
    response = self.server.get(self.path_prefix)
    self.assertEqual(404, response.status_code)

  def testBaseUrlRequestNonexistentPage(self):
    """Request a page that doesn't exist; it should 404."""
    response = self.server.get(self.path_prefix + '/asdf')
    self.assertEqual(404, response.status_code)

  def testBaseUrlNonexistentPluginsListing(self):
    """Test the format of the data/plugins_listing endpoint."""
    response = self.server.get('/non_existent_prefix/data/plugins_listing')
    self.assertEqual(404, response.status_code)

  def testPluginsListing(self):
    """Test the format of the data/plugins_listing endpoint."""
    parsed_object = self._get_json(self.path_prefix + '/data/plugins_listing')
    # Plugin foo is active. Plugin bar is not.
    self.assertEqual(parsed_object, {'foo': True, 'bar': False})


class ApplicationPluginNameTest(tf.test.TestCase):

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
          temp_dir, plugins, multiplexer, reload_interval=0,
          path_prefix='')
    else:
      with six.assertRaisesRegex(self, ValueError, r'invalid name'):
        application.TensorBoardWSGIApp(
            temp_dir, plugins, multiplexer, reload_interval=0,
            path_prefix='')

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


class ApplicationPluginRouteTest(tf.test.TestCase):

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
          temp_dir, plugins, multiplexer, reload_interval=0, path_prefix='')
    else:
      with six.assertRaisesRegex(self, ValueError, r'invalid route'):
        application.TensorBoardWSGIApp(
            temp_dir, plugins, multiplexer, reload_interval=0, path_prefix='')

  def testNormalRoute(self):
    self._test('/runs', True)

  def testEmptyRoute(self):
    self._test('', False)

  def testSlashlessRoute(self):
    self._test('runaway', False)


class ParseEventFilesSpecTest(tf.test.TestCase):

  def assertPlatformSpecificLogdirParsing(self, pathObj, logdir, expected):
    """
    A custom assertion to test :func:`parse_event_files_spec` under various
    systems.

    Args:
        pathObj: a custom replacement object for `os.path`, typically
          `posixpath` or `ntpath`
        logdir: the string to be parsed by
          :func:`~application.TensorBoardWSGIApp.parse_event_files_spec`
        expected: the expected dictionary as returned by
          :func:`~application.TensorBoardWSGIApp.parse_event_files_spec`

    """

    with mock.patch('os.path', pathObj):
      self.assertEqual(application.parse_event_files_spec(logdir), expected)

  def testBasic(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, '/lol/cat', {'/lol/cat': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'C:\\lol\cat', {'C:\\lol\cat': None})

  def testRunName(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'lol:/cat', {'/cat': 'lol'})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'lol:C:\\cat', {'C:\\cat': 'lol'})

  def testPathWithColonThatComesAfterASlash_isNotConsideredARunName(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, '/lol:/cat', {'/lol:/cat': None})

  def testExpandsUser(self):
    oldhome = os.environ.get('HOME', None)
    try:
      os.environ['HOME'] = '/usr/eliza'
      self.assertPlatformSpecificLogdirParsing(
          posixpath, '~/lol/cat~dog', {'/usr/eliza/lol/cat~dog': None})
      os.environ['HOME'] = 'C:\\Users\eliza'
      self.assertPlatformSpecificLogdirParsing(
          ntpath, '~\lol\cat~dog', {'C:\\Users\eliza\lol\cat~dog': None})
    finally:
      if oldhome is not None:
        os.environ['HOME'] = oldhome

  def testExpandsUserForMultipleDirectories(self):
    oldhome = os.environ.get('HOME', None)
    try:
      os.environ['HOME'] = '/usr/eliza'
      self.assertPlatformSpecificLogdirParsing(
          posixpath, 'a:~/lol,b:~/cat',
          {'/usr/eliza/lol': 'a', '/usr/eliza/cat': 'b'})
      os.environ['HOME'] = 'C:\\Users\eliza'
      self.assertPlatformSpecificLogdirParsing(
          ntpath, 'aa:~\lol,bb:~\cat',
          {'C:\\Users\eliza\lol': 'aa', 'C:\\Users\eliza\cat': 'bb'})
    finally:
      if oldhome is not None:
        os.environ['HOME'] = oldhome

  def testMultipleDirectories(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, '/a,/b', {'/a': None, '/b': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'C:\\a,C:\\b', {'C:\\a': None, 'C:\\b': None})

  def testNormalizesPaths(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, '/lol/.//cat/../cat', {'/lol/cat': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'C:\\lol\\.\\\\cat\\..\\cat', {'C:\\lol\\cat': None})

  def testAbsolutifies(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'lol/cat', {posixpath.realpath('lol/cat'): None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'lol\\cat', {ntpath.realpath('lol\\cat'): None})

  def testRespectsGCSPath(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'gs://foo/path', {'gs://foo/path': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'gs://foo/path', {'gs://foo/path': None})

  def testRespectsHDFSPath(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'hdfs://foo/path', {'hdfs://foo/path': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'hdfs://foo/path', {'hdfs://foo/path': None})

  def testDoesNotExpandUserInGCSPath(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'gs://~/foo/path', {'gs://~/foo/path': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'gs://~/foo/path', {'gs://~/foo/path': None})

  def testDoesNotNormalizeGCSPath(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'gs://foo/./path//..', {'gs://foo/./path//..': None})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'gs://foo/./path//..', {'gs://foo/./path//..': None})

  def testRunNameWithGCSPath(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'lol:gs://foo/path', {'gs://foo/path': 'lol'})
    self.assertPlatformSpecificLogdirParsing(
        ntpath, 'lol:gs://foo/path', {'gs://foo/path': 'lol'})

  def testSingleLetterGroup(self):
    self.assertPlatformSpecificLogdirParsing(
        posixpath, 'A:/foo/path', {'/foo/path': 'A'})
    # single letter groups are not supported on Windows
    with self.assertRaises(AssertionError):
      self.assertPlatformSpecificLogdirParsing(
          ntpath, 'A:C:\\foo\\path', {'C:\\foo\\path': 'A'})


class TensorBoardPluginsTest(tf.test.TestCase):

  def setUp(self):
    self.context = None
    dummy_assets_zip_provider = lambda: None
    # The application should have added routes for both plugins.
    self.app = application.standard_tensorboard_wsgi(
        FakeFlags(logdir=self.get_temp_dir()),
        [
          base_plugin.BasicLoader(functools.partial(
              FakePlugin,
              plugin_name='foo',
              is_active_value=True,
              routes_mapping={'/foo_route': self._foo_handler},
              construction_callback=self._construction_callback)),
          base_plugin.BasicLoader(functools.partial(
              FakePlugin,
              plugin_name='bar',
              is_active_value=True,
              routes_mapping={'/bar_route': self._bar_handler},
              construction_callback=self._construction_callback)),
        ],
        dummy_assets_zip_provider)

  def _foo_handler(self):
    pass

  def _bar_handler(self):
    pass

  def _construction_callback(self, context):
    """Called when a plugin is constructed."""
    self.context = context

  def testPluginsAdded(self):
    # The routes are prefixed with /data/plugin/[plugin name].
    self.assertDictContainsSubset({
        '/data/plugin/foo/foo_route': self._foo_handler,
        '/data/plugin/bar/bar_route': self._bar_handler,
    }, self.app.data_applications)

  def testNameToPluginMapping(self):
    # The mapping from plugin name to instance should include both plugins.
    mapping = self.context.plugin_name_to_instance
    self.assertItemsEqual(['foo', 'bar'], list(mapping.keys()))
    self.assertEqual('foo', mapping['foo'].plugin_name)
    self.assertEqual('bar', mapping['bar'].plugin_name)


class ApplicationConstructionTest(tf.test.TestCase):

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
      application.TensorBoardWSGIApp(logdir, plugins, multiplexer, 0, '')

    # Fails if there are two plugins with same name
    with self.assertRaises(ValueError):
      plugins = [
          FakePlugin(
              None, plugin_name='foo', is_active_value=True, routes_mapping={}),
          FakePlugin(
              None, plugin_name='foo', is_active_value=True, routes_mapping={}),
      ]
      application.TensorBoardWSGIApp(logdir, plugins, multiplexer, 0, '')


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
