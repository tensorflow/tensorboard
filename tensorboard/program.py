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
"""Utilities for TensorBoard command line program.

This is a lightweight module for bringing up a TensorBoard HTTP server
or emulating the `tensorboard` shell command.

Those wishing to create custom builds of TensorBoard can use this module
by swapping out `tensorboard.main` with the custom definition that
modifies the set of plugins and static assets.

This module does not depend on first-party plugins or the default web
server assets. Those are defined in `tensorboard.default_plugins`.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import errno
import logging
import os
import socket
import sys
import threading

from werkzeug import serving

from tensorboard import util
from tensorboard import version
from tensorboard.backend import application
from tensorboard.backend.event_processing import event_file_inspector as efi

logger = logging.getLogger(__name__)


def setup_environment():
  """Makes recommended modifications to the environment.

  This functions changes global state in the Python process. Calling
  this function is a good idea, but it can't appropriately be called
  from library routines.
  """
  util.setup_logging()

  # The default is HTTP/1.0 for some strange reason. If we don't use
  # HTTP/1.1 then a new TCP socket and Python thread is created for
  # each HTTP request. The tradeoff is we must always specify the
  # Content-Length header, or do chunked encoding for streaming.
  serving.WSGIRequestHandler.protocol_version = 'HTTP/1.1'


class TensorBoard(object):
  """Class for launching TensorBoard web server.

  Fields:
    plugin_loaders: Set by constructor.
    assets_zip_provider: Set by constructor.
    flags: An argparse.Namespace() set by the configure() method, that
      is initially None.
    unparsed_argv: A list of strings set by the configure() method.
  """

  def __init__(self,
               plugin_loaders=None,
               assets_zip_provider=None,
               wsgi_middleware=None):
    """Creates new instance.

    The configure() method should be called after creating a new
    instance of this classe.

    Args:
      plugin_loaders: A list of TBLoader plugin loader instances. If not
        specified, defaults to first-party plugins.
      assets_zip_provider: Delegates to TBContext or uses default if
        None.
      wsgi_middleware: Optional function for installing middleware
        around the standard TensorBoard WSGI handler.

    :type plugin_loaders: list[base_plugin.TBLoader]
    :type assets_zip_provider: () -> file
    """
    if plugin_loaders is None:
      from tensorboard import default
      plugin_loaders = default.PLUGIN_LOADERS
    if assets_zip_provider is None:
      from tensorboard import default
      assets_zip_provider = default.get_assets_zip_provider()
    self.plugin_loaders = plugin_loaders
    self.assets_zip_provider = assets_zip_provider
    self._wsgi_middleware = wsgi_middleware
    self.flags = None
    self.unparsed_argv = []

  def configure(self, argv=(), **kwargs):
    """Creates TensorBoard CLI flag configuration object.

    The default behavior of this method is to construct an object with
    its attributes set to the default values of all flags, specified by
    all plugins.

    Args:
      argv: This can be set (to what is usually) sys.argv[1:] to parse
        CLI args.
      kwargs: Additional arguments will override what was parsed from
        argv. They must be passed as Python data structures, e.g.
        `foo=1` rather than `foo="1"`.

    Returns:
      The result is stored to the flags and unparsed_argv fields. This
      method always returns None.

    Raises:
      ValueError: If flag values are invalid.
    """
    parser = argparse.ArgumentParser(
        prog='tensorboard',
        description=('TensorBoard is a suite of web applications for '
                     'inspectinng and understanding your TensorFlow runs '
                     'and graphs. https://github.com/tensorflow/tensorboard'))
    for loader in self.plugin_loaders:
      loader.define_flags(parser)
    flags, unparsed_argv = parser.parse_known_args(argv)
    for k, v in kwargs.items():
      if hasattr(flags, k):
        raise ValueError('Unknown TensorBoard flag: %s' % k)
      setattr(flags, k, v)
    for loader in self.plugin_loaders:
      loader.fix_flags(flags)
    self.flags = flags
    self.unparsed_argv = unparsed_argv

  def main(self, unparsed_argv=None):
    """Blocking main function for TensorBoard.

    This method is called by `tensorboard.main.run_main`, which is the
    standard entrypoint for the tensorboard command line program. The
    configure() method must be called first.

    Args:
      unparsed_argv: Ignored (required for Abseil compatibility).

    Returns:
      Process exit code, i.e. 0 if successful or non-zero on failure. In
      practice, an exception will most likely be raised instead of
      returning non-zero.

    :rtype: int
    """
    if self.flags.inspect:
      logger.info('Not bringing up TensorBoard, but inspecting event files.')
      event_file = os.path.expanduser(self.flags.event_file)
      efi.inspect(self.flags.logdir,
                  self.flags.event_file,
                  self.flags.tag)
      return 0
    try:
      server, url = self._get_server()
    except socket.error:
      return -1
    sys.stderr.write('TensorBoard %s at %s (Press CTRL+C to quit)\n' %
                     (version.VERSION, url))
    sys.stderr.flush()
    server.serve_forever()
    return 0

  def launch(self):
    """Python API for launching TensorBoard.

    This method is the same as main() except it launches TensorBoard in
    a separate permanent thread. The configure() method must be called
    first.

    Returns:
      The URL of the TensorBoard web server.

    Raises:
      socket.error: If a server could not be constructed with the host
        and port specified. Also logs an error message.

    :rtype: str
    """
    # Make it easy to run TensorBoard inside other programs, e.g. Colab.
    server, url = self._get_server()
    thread = threading.Thread(target=server.serve_forever, name='TensorBoard')
    thread.daemon = True
    thread.start()
    return url

  def _get_server(self):
    app = application.standard_tensorboard_wsgi(self.flags,
                                                self.plugin_loaders,
                                                self.assets_zip_provider)
    if self._wsgi_middleware is not None:
      app = self._wsgi_middleware(app)
    return make_simple_server(app,
                              self.flags.host,
                              self.flags.port,
                              self.flags.path_prefix)


def make_simple_server(tb_app, host='', port=0, path_prefix=''):
  """Create an HTTP server for TensorBoard.

  Args:
    tb_app: The TensorBoard WSGI application to create a server for.
    host: Indicates the interfaces to bind to ('::' or '0.0.0.0' for all
        interfaces, '::1' or '127.0.0.1' for localhost). A blank value ('')
        indicates protocol-agnostic all interfaces.
    port: The port to bind to (0 indicates an unused port selected by the
        operating system).
    path_prefix: Optional relative prefix to the path, e.g. "/service/tf".

  Returns:
    A tuple of (server, url):
      server: An HTTP server object configured to host TensorBoard.
      url: A best guess at a URL where TensorBoard will be accessible once the
        server has been started.

  Raises:
    socket.error: If a server could not be constructed with the host and port
      specified. Also logs an error message.
  """
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
  except socket.error:
    if port == 0:
      msg = 'TensorBoard unable to find any open port'
    else:
      msg = (
          'TensorBoard attempted to bind to port %d, but it was already in use'
          % port)
    logger.error(msg)
    print(msg)
    raise
  server.handle_error = _handle_error
  final_port = server.socket.getsockname()[1]
  tensorboard_url = 'http://%s:%d%s' % (final_host, final_port,
                                        path_prefix)
  return server, tensorboard_url


# Kludge to override a SocketServer.py method so we can get rid of noisy
# EPIPE errors. They're kind of a red herring as far as errors go. For
# example, `curl -N http://localhost:6006/ | head` will cause an EPIPE.
def _handle_error(unused_request, client_address):
  exc_info = sys.exc_info()
  e = exc_info[1]
  if isinstance(e, IOError) and e.errno == errno.EPIPE:
    logger.warn('EPIPE caused by %s:%d in HTTP serving' % client_address)
  else:
    logger.error('HTTP serving error', exc_info=exc_info)
