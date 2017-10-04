# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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
"""Serve TensorFlow summary data to a web frontend.

This is a simple web server to proxy data from the event_loader to the web, and
serve static web files.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import errno
import os
import socket
import sys

import six
import tensorflow as tf
from werkzeug import serving

from tensorboard import util
from tensorboard import version
from tensorboard.backend import application
from tensorboard.backend.event_processing import event_file_inspector as efi
from tensorboard.plugins.audio import audio_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.distribution import distributions_plugin
from tensorboard.plugins.graph import graphs_plugin
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.image import images_plugin
from tensorboard.plugins.pr_curve import pr_curves_plugin
from tensorboard.plugins.profile import profile_plugin
from tensorboard.plugins.projector import projector_plugin
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.text import text_plugin

# TensorBoard flags

tf.flags.DEFINE_string('logdir', '', """logdir specifies the directory where
TensorBoard will look to find TensorFlow event files that it can display.
TensorBoard will recursively walk the directory structure rooted at logdir,
looking for .*tfevents.* files.

You may also pass a comma separated list of log directories, and TensorBoard
will watch each directory. You can also assign names to individual log
directories by putting a colon between the name and the path, as in

tensorboard --logdir name1:/path/to/logs/1,name2:/path/to/logs/2
""")

tf.flags.DEFINE_string(
    'host', '', 'What host to listen to. Defaults to '
    'serving on all interfaces, set to 127.0.0.1 (localhost) to'
    'disable remote access (also quiets security warnings).')

tf.flags.DEFINE_integer('port', 6006, 'What port to serve TensorBoard on.')

tf.flags.DEFINE_boolean(
    'purge_orphaned_data', True, 'Whether to purge data that '
    'may have been orphaned due to TensorBoard restarts. '
    'Disabling purge_orphaned_data can be used to debug data '
    'disappearance.')

tf.flags.DEFINE_integer('reload_interval', 5,
                        'How often the backend should load '
                        'more data.')

tf.flags.DEFINE_string('db', "", """\
[Experimental] Sets SQL database URI.

This mode causes TensorBoard to persist experiments to a SQL database. The
following databases are supported:

- sqlite: Use SQLite built in to Python. URI must specify the path of the
  database file, which will be created if it doesn't exist. For example:
  --db sqlite3:~/.tensorboard.db

Warning: This feature is a work in progress and only has limited support.
""")

# Inspect Mode flags

tf.flags.DEFINE_boolean('inspect', False, """Use this flag to print out a digest
of your event files to the command line, when no data is shown on TensorBoard or
the data shown looks weird.

Example usages:
tensorboard --inspect --event_file myevents.out
tensorboard --inspect --event_file myevents.out --tag loss
tensorboard --inspect --logdir mylogdir
tensorboard --inspect --logdir mylogdir --tag loss

See tensorflow/python/summary/event_file_inspector.py for more info and
detailed usage.
""")

tf.flags.DEFINE_string(
    'tag', '',
    'The particular tag to query for. Only used if --inspect is present')

tf.flags.DEFINE_string(
    'event_file', '',
    'The particular event file to query for. Only used if --inspect is present '
    'and --logdir is not specified.')
tf.flags.DEFINE_string(
    'path_prefix', '',
    'An optional, relative prefix to the path, e.g. "/path/to/tensorboard". '
    'resulting in the new base url being located at '
    'localhost:6006/path/to/tensorboard under default settings. A leading '
    'slash is required when specifying the path_prefix, however trailing '
    'slashes can be omitted. The path_prefix can be leveraged for path '
    'based routing of an elb when the website base_url is not available '
    'e.g. "example.site.com/path/to/tensorboard/"')

tf.flags.DEFINE_integer(
    'debugger_data_server_grpc_port', None,
    'The port at which the debugger data server (to be started by the debugger '
    'plugin) should receive debugging data via gRPC from one or more '
    'debugger-enabled TensorFlow runtimes. No debugger plugin or debugger data '
    'server will be started if this flag is not provided.')

FLAGS = tf.flags.FLAGS


def create_tb_app(plugins, assets_zip_provider=None):
  """Read the flags, and create a TensorBoard WSGI application.

  Args:
    plugins: A list of constructor functions for TBPlugin subclasses.
    assets_zip_provider: Delegates to TBContext or uses default if None.

  Raises:
    ValueError: if a logdir is not specified.

  Returns:
    A new TensorBoard WSGI application.
  """
  if not FLAGS.db and not FLAGS.logdir:
    raise ValueError('A logdir must be specified when db is not specified. '
                     'Run `tensorboard --help` for details and examples.')
  return application.standard_tensorboard_wsgi(
      assets_zip_provider=assets_zip_provider,
      db_uri=FLAGS.db,
      logdir=os.path.expanduser(FLAGS.logdir),
      purge_orphaned_data=FLAGS.purge_orphaned_data,
      reload_interval=FLAGS.reload_interval,
      plugins=plugins,
      path_prefix=FLAGS.path_prefix)


def make_simple_server(tb_app, host=None, port=None, path_prefix=None):
  """Create an HTTP server for TensorBoard.

  Args:
    tb_app: The TensorBoard WSGI application to create a server for.
    host: Indicates the interfaces to bind to ('::' or '0.0.0.0' for all
        interfaces, '::1' or '127.0.0.1' for localhost). A blank value ('')
        indicates protocol-agnostic all interfaces. If not specified, will
        default to the flag value.
    port: The port to bind to (0 indicates an unused port selected by the
        operating system). If not specified, will default to the flag value.
    path_prefix: Optional relative prefix to the path, e.g. "/service/tf"

  Returns:
    A tuple of (server, url):
      server: An HTTP server object configured to host TensorBoard.
      url: A best guess at a URL where TensorBoard will be accessible once the
        server has been started.

  Raises:
    socket.error: If a server could not be constructed with the host and port
      specified. Also logs an error message.
  """
  if host is None:
    host = FLAGS.host
  if port is None:
    port = FLAGS.port
  if path_prefix is None:
    path_prefix = FLAGS.path_prefix
  try:
    if host:
      # The user gave us an explicit host
      server = serving.make_server(host, port, tb_app, threaded=True)
      if ':' in host and not host.startswith('['):
        # Display IPv6 addresses as [::1]:80 rather than ::1:80
        final_host = '[{}]'.format(host)
      else:
        final_host = host
    else:
      # We've promised to bind to all interfaces on this host. However, we're
      # not sure whether that means IPv4 or IPv6 interfaces.
      try:
        # First try passing in a blank host (meaning all interfaces). This,
        # unfortunately, defaults to IPv4 even if no IPv4 interface is available
        # (yielding a socket.error).
        server = serving.make_server(host, port, tb_app, threaded=True)
      except socket.error:
        # If a blank host didn't work, we explicitly request IPv6 interfaces.
        server = serving.make_server('::', port, tb_app, threaded=True)
      final_host = socket.gethostname()
    server.daemon_threads = True
  except socket.error as socket_error:
    if port == 0:
      msg = 'TensorBoard unable to find any open port'
    else:
      msg = (
          'TensorBoard attempted to bind to port %d, but it was already in use'
          % port)
    tf.logging.error(msg)
    print(msg)
    raise socket_error
  server.handle_error = _handle_error
  final_port = server.socket.getsockname()[1]
  tensorboard_url = 'http://%s:%d%s' % (final_host, final_port, path_prefix)
  return server, tensorboard_url


def run_simple_server(tb_app):
  """Run a TensorBoard HTTP server, and print some messages to the console."""
  try:
    server, url = make_simple_server(tb_app)
  except socket.error:
    # An error message was already logged
    # TODO(@jart): Remove log and throw anti-pattern.
    sys.exit(-1)
  sys.stderr.write('TensorBoard %s at %s (Press CTRL+C to quit)\n' %
                   (version.VERSION, url))
  sys.stderr.flush()
  server.serve_forever()


# Kludge to override a SocketServer.py method so we can get rid of noisy
# EPIPE errors. They're kind of a red herring as far as errors go. For
# example, `curl -N http://localhost:6006/ | head` will cause an EPIPE.
def _handle_error(unused_request, client_address):
  exc_info = sys.exc_info()
  e = exc_info[1]
  if isinstance(e, IOError) and e.errno == errno.EPIPE:
    tf.logging.warn('EPIPE caused by %s:%d in HTTP serving' % client_address)
  else:
    tf.logging.error('HTTP serving error', exc_info=exc_info)


def main(unused_argv=None):
  util.setup_logging()
  if FLAGS.inspect:
    tf.logging.info('Not bringing up TensorBoard, but inspecting event files.')
    event_file = os.path.expanduser(FLAGS.event_file)
    efi.inspect(FLAGS.logdir, event_file, FLAGS.tag)
    return 0
  else:

    # The default is HTTP/1.0 for some strange reason. If we don't use
    # HTTP/1.1 then a new TCP socket and Python thread is created for
    # each HTTP request. The tradeoff is we must always specify the
    # Content-Length header, or do chunked encoding for streaming.
    serving.WSGIRequestHandler.protocol_version = 'HTTP/1.1'

    plugins = [
        core_plugin.CorePlugin,
        scalars_plugin.ScalarsPlugin,
        images_plugin.ImagesPlugin,
        audio_plugin.AudioPlugin,
        graphs_plugin.GraphsPlugin,
        distributions_plugin.DistributionsPlugin,
        histograms_plugin.HistogramsPlugin,
        pr_curves_plugin.PrCurvesPlugin,
        projector_plugin.ProjectorPlugin,
        text_plugin.TextPlugin,
        profile_plugin.ProfilePlugin,
    ]

    def ConstructDebuggerPluginWithGrpcPort(context):
      try:
        # pylint: disable=line-too-long,g-import-not-at-top
        from tensorboard.plugins.debugger import debugger_plugin as debugger_plugin_lib
        # pylint: enable=line-too-long,g-import-not-at-top
      except ImportError as err:
        (unused_type, unused_value, traceback) = sys.exc_info()
        six.reraise(
            ImportError,
            ImportError(
                err.message +
                "\n\nTo use the debugger plugin, you need to have futures and "
                "grpcio installed:\n  pip install futures grpcio"),
            traceback)
      tf.logging.info("Starting Debugger Plugin at gRPC port %d",
                      FLAGS.debugger_data_server_grpc_port)
      debugger_plugin = debugger_plugin_lib.DebuggerPlugin(context)
      debugger_plugin.listen(FLAGS.debugger_data_server_grpc_port)
      return debugger_plugin
    if FLAGS.debugger_data_server_grpc_port is not None:
      plugins.append(ConstructDebuggerPluginWithGrpcPort)

    tb = create_tb_app(plugins)
    run_simple_server(tb)


if __name__ == '__main__':
  tf.app.run()
