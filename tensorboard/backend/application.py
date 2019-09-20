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
"""TensorBoard WSGI Application Logic.

Provides TensorBoardWSGIApp for building a TensorBoard WSGI app.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import atexit
import collections
import contextlib
import json
import os
import re
import shutil
import sqlite3
import tempfile
import threading
import time

import six
from six.moves.urllib import parse as urlparse  # pylint: disable=wrong-import-order

from werkzeug import wrappers

from tensorboard import errors
from tensorboard.backend import http_util
from tensorboard.backend.event_processing import db_import_multiplexer
from tensorboard.backend.event_processing import data_provider as event_data_provider  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.audio import metadata as audio_metadata
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.histogram import metadata as histogram_metadata
from tensorboard.plugins.image import metadata as image_metadata
from tensorboard.plugins.pr_curve import metadata as pr_curve_metadata
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.util import tb_logging


DEFAULT_SIZE_GUIDANCE = {
    event_accumulator.TENSORS: 10,
}

# TODO(@wchargin): Once SQL mode is in play, replace this with an
# alternative that does not privilege first-party plugins.
DEFAULT_TENSOR_SIZE_GUIDANCE = {
    scalar_metadata.PLUGIN_NAME: 1000,
    image_metadata.PLUGIN_NAME: 10,
    audio_metadata.PLUGIN_NAME: 10,
    histogram_metadata.PLUGIN_NAME: 500,
    pr_curve_metadata.PLUGIN_NAME: 100,
}

DATA_PREFIX = '/data'
PLUGIN_PREFIX = '/plugin'
PLUGINS_LISTING_ROUTE = '/plugins_listing'

# Slashes in a plugin name could throw the router for a loop. An empty
# name would be confusing, too. To be safe, let's restrict the valid
# names as follows.
_VALID_PLUGIN_RE = re.compile(r'^[A-Za-z0-9_.-]+$')

logger = tb_logging.get_logger()


def tensor_size_guidance_from_flags(flags):
  """Apply user per-summary size guidance overrides."""

  tensor_size_guidance = dict(DEFAULT_TENSOR_SIZE_GUIDANCE)
  if not flags or not flags.samples_per_plugin:
    return tensor_size_guidance

  for token in flags.samples_per_plugin.split(','):
    k, v = token.strip().split('=')
    tensor_size_guidance[k] = int(v)

  return tensor_size_guidance


def standard_tensorboard_wsgi(flags, plugin_loaders, assets_zip_provider):
  """Construct a TensorBoardWSGIApp with standard plugins and multiplexer.

  Args:
    flags: An argparse.Namespace containing TensorBoard CLI flags.
    plugin_loaders: A list of TBLoader instances.
    assets_zip_provider: See TBContext documentation for more information.

  Returns:
    The new TensorBoard WSGI application.

  :type plugin_loaders: list[base_plugin.TBLoader]
  :rtype: TensorBoardWSGI
  """
  data_provider = None
  multiplexer = None
  reload_interval = flags.reload_interval
  if flags.db_import:
    # DB import mode.
    db_uri = flags.db
    # Create a temporary DB file if we weren't given one.
    if not db_uri:
      tmpdir = tempfile.mkdtemp(prefix='tbimport')
      atexit.register(shutil.rmtree, tmpdir)
      db_uri = 'sqlite:%s/tmp.sqlite' % tmpdir
    db_connection_provider = create_sqlite_connection_provider(db_uri)
    logger.info('Importing logdir into DB at %s', db_uri)
    multiplexer = db_import_multiplexer.DbImportMultiplexer(
        db_uri=db_uri,
        db_connection_provider=db_connection_provider,
        purge_orphaned_data=flags.purge_orphaned_data,
        max_reload_threads=flags.max_reload_threads)
  elif flags.db:
    # DB read-only mode, never load event logs.
    reload_interval = -1
    db_connection_provider = create_sqlite_connection_provider(flags.db)
    multiplexer = _DbModeMultiplexer(flags.db, db_connection_provider)
  else:
    # Regular logdir loading mode.
    multiplexer = event_multiplexer.EventMultiplexer(
        size_guidance=DEFAULT_SIZE_GUIDANCE,
        tensor_size_guidance=tensor_size_guidance_from_flags(flags),
        purge_orphaned_data=flags.purge_orphaned_data,
        max_reload_threads=flags.max_reload_threads,
        event_file_active_filter=_get_event_file_active_filter(flags))
    if flags.generic_data != 'false':
      data_provider = event_data_provider.MultiplexerDataProvider(
          multiplexer, flags.logdir or flags.logdir_spec
      )

  if reload_interval >= 0:
    # We either reload the multiplexer once when TensorBoard starts up, or we
    # continuously reload the multiplexer.
    if flags.logdir:
      path_to_run = {os.path.expanduser(flags.logdir): None}
    else:
      path_to_run = parse_event_files_spec(flags.logdir_spec)
    start_reloading_multiplexer(
        multiplexer, path_to_run, reload_interval, flags.reload_task)
  return TensorBoardWSGIApp(
      flags, plugin_loaders, data_provider, assets_zip_provider, multiplexer)


def _handling_errors(wsgi_app):
  def wrapper(*args):
    (environ, start_response) = (args[-2], args[-1])
    try:
      return wsgi_app(*args)
    except errors.PublicError as e:
      request = wrappers.Request(environ)
      error_app = http_util.Respond(
          request, str(e), "text/plain", code=e.http_code
      )
      return error_app(environ, start_response)
    # Let other exceptions be handled by the server, as an opaque
    # internal server error.
  return wrapper


def TensorBoardWSGIApp(
    flags,
    plugins,
    data_provider=None,
    assets_zip_provider=None,
    deprecated_multiplexer=None):
  """Constructs a TensorBoard WSGI app from plugins and data providers.

  Args:
    flags: An argparse.Namespace containing TensorBoard CLI flags.
    plugins: A list of plugins, which can be provided as TBPlugin subclasses
        or TBLoader instances or subclasses.
    assets_zip_provider: See TBContext documentation for more information.
    data_provider: Instance of `tensorboard.data.provider.DataProvider`. May
        be `None` if `flags.generic_data` is set to `"false"` in which case
        `deprecated_multiplexer` must be passed instead.
    deprecated_multiplexer: Optional `plugin_event_multiplexer.EventMultiplexer`
        to use for any plugins not yet enabled for the DataProvider API.
        Required if the data_provider argument is not passed.

  Returns:
    A WSGI application that implements the TensorBoard backend.
  """
  db_uri = None
  db_connection_provider = None
  if isinstance(
      deprecated_multiplexer,
      (db_import_multiplexer.DbImportMultiplexer, _DbModeMultiplexer)):
    db_uri = deprecated_multiplexer.db_uri
    db_connection_provider = deprecated_multiplexer.db_connection_provider
  plugin_name_to_instance = {}
  context = base_plugin.TBContext(
      data_provider=data_provider,
      db_connection_provider=db_connection_provider,
      db_uri=db_uri,
      flags=flags,
      logdir=flags.logdir,
      multiplexer=deprecated_multiplexer,
      assets_zip_provider=assets_zip_provider,
      plugin_name_to_instance=plugin_name_to_instance,
      window_title=flags.window_title)
  tbplugins = []
  for plugin_spec in plugins:
    loader = make_plugin_loader(plugin_spec)
    plugin = loader.load(context)
    if plugin is None:
      continue
    tbplugins.append(plugin)
    plugin_name_to_instance[plugin.plugin_name] = plugin
  return TensorBoardWSGI(tbplugins, flags.path_prefix)


class TensorBoardWSGI(object):
  """The TensorBoard WSGI app that delegates to a set of TBPlugin."""

  def __init__(self, plugins, path_prefix=''):
    """Constructs TensorBoardWSGI instance.

    Args:
      plugins: A list of base_plugin.TBPlugin subclass instances.
      flags: An argparse.Namespace containing TensorBoard CLI flags.

    Returns:
      A WSGI application for the set of all TBPlugin instances.

    Raises:
      ValueError: If some plugin has no plugin_name
      ValueError: If some plugin has an invalid plugin_name (plugin
          names must only contain [A-Za-z0-9_.-])
      ValueError: If two plugins have the same plugin_name
      ValueError: If some plugin handles a route that does not start
          with a slash

    :type plugins: list[base_plugin.TBPlugin]
    """
    self._plugins = plugins
    if path_prefix.endswith('/'):
      self._path_prefix = path_prefix[:-1]
    else:
      self._path_prefix = path_prefix

    self.exact_routes = {
        # TODO(@chihuahua): Delete this RPC once we have skylark rules that
        # obviate the need for the frontend to determine which plugins are
        # active.
        self._path_prefix + DATA_PREFIX + PLUGINS_LISTING_ROUTE:
            self._serve_plugins_listing,
    }
    unordered_prefix_routes = {}

    # Serve the routes from the registered plugins using their name as the route
    # prefix. For example if plugin z has two routes /a and /b, they will be
    # served as /data/plugin/z/a and /data/plugin/z/b.
    plugin_names_encountered = set()
    for plugin in self._plugins:
      if plugin.plugin_name is None:
        raise ValueError('Plugin %s has no plugin_name' % plugin)
      if not _VALID_PLUGIN_RE.match(plugin.plugin_name):
        raise ValueError('Plugin %s has invalid name %r' % (plugin,
                                                            plugin.plugin_name))
      if plugin.plugin_name in plugin_names_encountered:
        raise ValueError('Duplicate plugins for name %s' % plugin.plugin_name)
      plugin_names_encountered.add(plugin.plugin_name)

      try:
        plugin_apps = plugin.get_plugin_apps()
      except Exception as e:  # pylint: disable=broad-except
        if type(plugin) is core_plugin.CorePlugin:  # pylint: disable=unidiomatic-typecheck
          raise
        logger.warn('Plugin %s failed. Exception: %s',
                           plugin.plugin_name, str(e))
        continue
      for route, app in plugin_apps.items():
        if not route.startswith('/'):
          raise ValueError('Plugin named %r handles invalid route %r: '
                           'route does not start with a slash' %
                           (plugin.plugin_name, route))
        if type(plugin) is core_plugin.CorePlugin:  # pylint: disable=unidiomatic-typecheck
          path = self._path_prefix + route
        else:
          path = (self._path_prefix + DATA_PREFIX + PLUGIN_PREFIX + '/' +
                  plugin.plugin_name + route)

        if path.endswith('/*'):
          # Note we remove the '*' but leave the slash in place.
          path = path[:-1]
          if '*' in path:
            # note we re-add the removed * in the format string
            raise ValueError('Plugin %r handles invalid route \'%s*\': Only '
                             'trailing wildcards are supported '
                             '(i.e., `/.../*`)' %
                             (plugin.plugin_name, path))
          unordered_prefix_routes[path] = app
        else:
          if '*' in path:
            raise ValueError('Plugin %r handles invalid route %r: Only '
                             'trailing wildcards are supported '
                             '(i.e., `/.../*`)' %
                             (plugin.plugin_name, path))
          self.exact_routes[path] = app

    # Wildcard routes will be checked in the given order, so we sort them
    # longest to shortest so that a more specific route will take precedence
    # over a more general one (e.g., a catchall route `/*` should come last).
    self.prefix_routes = collections.OrderedDict(
        sorted(
            six.iteritems(unordered_prefix_routes),
            key=lambda x: len(x[0]),
            reverse=True))


  @wrappers.Request.application
  def _serve_plugins_listing(self, request):
    """Serves an object mapping plugin name to whether it is enabled.

    Args:
      request: The werkzeug.Request object.

    Returns:
      A werkzeug.Response object.
    """
    response = collections.OrderedDict()
    for plugin in self._plugins:
      if type(plugin) is core_plugin.CorePlugin:  # pylint: disable=unidiomatic-typecheck
        # This plugin's existence is a backend implementation detail.
        continue
      start = time.time()
      is_active = plugin.is_active()
      elapsed = time.time() - start
      logger.info(
          'Plugin listing: is_active() for %s took %0.3f seconds',
          plugin.plugin_name, elapsed)

      plugin_metadata = plugin.frontend_metadata()
      output_metadata = {
          'disable_reload': plugin_metadata.disable_reload,
          'enabled': is_active,
          # loading_mechanism set below
          'remove_dom': plugin_metadata.remove_dom,
          # tab_name set below
      }

      if plugin_metadata.tab_name is not None:
        output_metadata['tab_name'] = plugin_metadata.tab_name
      else:
        output_metadata['tab_name'] = plugin.plugin_name

      es_module_handler = plugin_metadata.es_module_path
      element_name = plugin_metadata.element_name
      if element_name is not None and es_module_handler is not None:
        logger.error(
            'Plugin %r declared as both legacy and iframed; skipping',
            plugin.plugin_name,
        )
        continue
      elif element_name is not None and es_module_handler is None:
        loading_mechanism = {
            'type': 'CUSTOM_ELEMENT',
            'element_name': element_name,
        }
      elif element_name is None and es_module_handler is not None:
        loading_mechanism = {
            'type': 'IFRAME',
            'module_path': ''.join([
                self._path_prefix, DATA_PREFIX, PLUGIN_PREFIX, '/',
                plugin.plugin_name, es_module_handler,
            ]),
        }
      else:
        # As a compatibility measure (for plugins that we don't
        # control), we'll pull it from the frontend registry for now.
        loading_mechanism = {
            'type': 'NONE',
        }
      output_metadata['loading_mechanism'] = loading_mechanism

      response[plugin.plugin_name] = output_metadata
    return http_util.Respond(request, response, 'application/json')

  @_handling_errors
  def __call__(self, environ, start_response):  # pylint: disable=invalid-name
    """Central entry point for the TensorBoard application.

    This method handles routing to sub-applications. It does simple routing
    using strict string matching.  Regular expressions are not supported.
    Wildcard routes such as `/foo/*` are supported as a special case.

    This __call__ method conforms to the WSGI spec, so that instances of this
    class are WSGI applications.

    Args:
      environ: See WSGI spec.
      start_response: See WSGI spec.

    Returns:
      A werkzeug Response.
    """
    request = wrappers.Request(environ)
    parsed_url = urlparse.urlparse(request.path)
    clean_path = _clean_path(parsed_url.path, self._path_prefix)

    # pylint: disable=too-many-function-args
    if clean_path in self.exact_routes:
      return self.exact_routes[clean_path](environ, start_response)
    else:
      for path_prefix in self.prefix_routes:
        if clean_path.startswith(path_prefix):
          return self.prefix_routes[path_prefix](environ, start_response)

      logger.warn('path %s not found, sending 404', clean_path)
      return http_util.Respond(request, 'Not found', 'text/plain', code=404)(
          environ, start_response)
    # pylint: enable=too-many-function-args


def parse_event_files_spec(logdir_spec):
  """Parses `logdir_spec` into a map from paths to run group names.

  The `--logdir_spec` flag format is a comma-separated list of path
  specifications. A path spec looks like 'group_name:/path/to/directory' or
  '/path/to/directory'; in the latter case, the group is unnamed. Group names
  cannot start with a forward slash: /foo:bar/baz will be interpreted as a spec
  with no name and path '/foo:bar/baz'.

  Globs are not supported.

  Args:
    logdir: A comma-separated list of run specifications.
  Returns:
    A dict mapping directory paths to names like {'/path/to/directory': 'name'}.
    Groups without an explicit name are named after their path. If logdir is
    None, returns an empty dict, which is helpful for testing things that don't
    require any valid runs.
  """
  files = {}
  if logdir_spec is None:
    return files
  # Make sure keeping consistent with ParseURI in core/lib/io/path.cc
  uri_pattern = re.compile('[a-zA-Z][0-9a-zA-Z.]*://.*')
  for specification in logdir_spec.split(','):
    # Check if the spec contains group. A spec start with xyz:// is regarded as
    # URI path spec instead of group spec. If the spec looks like /foo:bar/baz,
    # then we assume it's a path with a colon. If the spec looks like
    # [a-zA-z]:\foo then we assume its a Windows path and not a single letter
    # group
    if (uri_pattern.match(specification) is None and ':' in specification and
        specification[0] != '/' and not os.path.splitdrive(specification)[0]):
      # We split at most once so run_name:/path:with/a/colon will work.
      run_name, _, path = specification.partition(':')
    else:
      run_name = None
      path = specification
    if uri_pattern.match(path) is None:
      path = os.path.realpath(os.path.expanduser(path))
    files[path] = run_name
  return files


def start_reloading_multiplexer(multiplexer, path_to_run, load_interval,
                                reload_task):
  """Starts automatically reloading the given multiplexer.

  If `load_interval` is positive, the thread will reload the multiplexer
  by calling `ReloadMultiplexer` every `load_interval` seconds, starting
  immediately. Otherwise, reloads the multiplexer once and never again.

  Args:
    multiplexer: The `EventMultiplexer` to add runs to and reload.
    path_to_run: A dict mapping from paths to run names, where `None` as the run
      name is interpreted as a run name equal to the path.
    load_interval: An integer greater than or equal to 0. If positive, how many
      seconds to wait after one load before starting the next load. Otherwise,
      reloads the multiplexer once and never again (no continuous reloading).
    reload_task: Indicates the type of background task to reload with.

  Raises:
    ValueError: If `load_interval` is negative.
  """
  if load_interval < 0:
    raise ValueError('load_interval is negative: %d' % load_interval)

  def _reload():
    while True:
      start = time.time()
      logger.info('TensorBoard reload process beginning')
      for path, name in six.iteritems(path_to_run):
        multiplexer.AddRunsFromDirectory(path, name)
      logger.info('TensorBoard reload process: Reload the whole Multiplexer')
      multiplexer.Reload()
      duration = time.time() - start
      logger.info('TensorBoard done reloading. Load took %0.3f secs', duration)
      if load_interval == 0:
        # Only load the multiplexer once. Do not continuously reload.
        break
      time.sleep(load_interval)

  if reload_task == 'process':
    logger.info('Launching reload in a child process')
    import multiprocessing
    process = multiprocessing.Process(target=_reload, name='Reloader')
    # Best-effort cleanup; on exit, the main TB parent process will attempt to
    # kill all its daemonic children.
    process.daemon = True
    process.start()
  elif reload_task in ('thread', 'auto'):
    logger.info('Launching reload in a daemon thread')
    thread = threading.Thread(target=_reload, name='Reloader')
    # Make this a daemon thread, which won't block TB from exiting.
    thread.daemon = True
    thread.start()
  elif reload_task == 'blocking':
    if load_interval != 0:
      raise ValueError('blocking reload only allowed with load_interval=0')
    _reload()
  else:
    raise ValueError('unrecognized reload_task: %s' % reload_task)


def create_sqlite_connection_provider(db_uri):
  """Returns function that returns SQLite Connection objects.

  Args:
    db_uri: A string URI expressing the DB file, e.g. "sqlite:~/tb.db".

  Returns:
    A function that returns a new PEP-249 DB Connection, which must be closed,
    each time it is called.

  Raises:
    ValueError: If db_uri is not a valid sqlite file URI.
  """
  uri = urlparse.urlparse(db_uri)
  if uri.scheme != 'sqlite':
    raise ValueError('Only sqlite DB URIs are supported: ' + db_uri)
  if uri.netloc:
    raise ValueError('Can not connect to SQLite over network: ' + db_uri)
  if uri.path == ':memory:':
    raise ValueError('Memory mode SQLite not supported: ' + db_uri)
  path = os.path.expanduser(uri.path)
  params = _get_connect_params(uri.query)
  # TODO(@jart): Add thread-local pooling.
  return lambda: sqlite3.connect(path, **params)


def _get_connect_params(query):
  params = urlparse.parse_qs(query)
  if any(len(v) > 2 for v in params.values()):
    raise ValueError('DB URI params list has duplicate keys: ' + query)
  return {k: json.loads(v[0]) for k, v in params.items()}


def _clean_path(path, path_prefix=""):
  """Cleans the path of the request.

  Removes the ending '/' if the request begins with the path prefix and pings a
  non-empty route.

  Arguments:
    path: The path of a request.
    path_prefix: The prefix string that every route of this TensorBoard instance
    starts with.

  Returns:
    The route to use to serve the request (with the path prefix stripped if
    applicable).
  """
  if path != path_prefix + '/' and path.endswith('/'):
    return path[:-1]
  return path


def _get_event_file_active_filter(flags):
  """Returns a predicate for whether an event file load timestamp is active.

  Returns:
    A predicate function accepting a single UNIX timestamp float argument, or
    None if multi-file loading is not enabled.
  """
  if not flags.reload_multifile:
    return None
  inactive_secs = flags.reload_multifile_inactive_secs
  if inactive_secs == 0:
    return None
  if inactive_secs < 0:
    return lambda timestamp: True
  return lambda timestamp: timestamp + inactive_secs >= time.time()


class _DbModeMultiplexer(event_multiplexer.EventMultiplexer):
  """Shim EventMultiplexer to use when in read-only DB mode.

  In read-only DB mode, the EventMultiplexer is nonfunctional - there is no
  logdir to reload, and the data is all exposed via SQL. This class represents
  the do-nothing EventMultiplexer for that purpose, which serves only as a
  conduit for DB-related parameters.

  The load APIs raise exceptions if called, and the read APIs always
  return empty results.
  """
  def __init__(self, db_uri, db_connection_provider):
    """Constructor for `_DbModeMultiplexer`.

    Args:
      db_uri: A URI to the database file in use.
      db_connection_provider: Provider function for creating a DB connection.
    """
    logger.info('_DbModeMultiplexer initializing for %s', db_uri)
    super(_DbModeMultiplexer, self).__init__()
    self.db_uri = db_uri
    self.db_connection_provider = db_connection_provider
    logger.info('_DbModeMultiplexer done initializing')

  def AddRun(self, path, name=None):
    """Unsupported."""
    raise NotImplementedError()

  def AddRunsFromDirectory(self, path, name=None):
    """Unsupported."""
    raise NotImplementedError()

  def Reload(self):
    """Unsupported."""
    raise NotImplementedError()


def make_plugin_loader(plugin_spec):
  """Returns a plugin loader for the given plugin.

  Args:
    plugin_spec: A TBPlugin subclass, or a TBLoader instance or subclass.

  Returns:
    A TBLoader for the given plugin.
  """
  if isinstance(plugin_spec, base_plugin.TBLoader):
    return plugin_spec
  if isinstance(plugin_spec, type):
    if issubclass(plugin_spec, base_plugin.TBLoader):
      return plugin_spec()
    if issubclass(plugin_spec, base_plugin.TBPlugin):
      return base_plugin.BasicLoader(plugin_spec)
  raise TypeError("Not a TBLoader or TBPlugin subclass: %r" % (plugin_spec,))
