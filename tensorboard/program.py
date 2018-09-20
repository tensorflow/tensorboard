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
server assets. Those are defined in `tensorboard.default`.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from abc import ABCMeta
from abc import abstractmethod
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
from tensorboard.plugins import base_plugin

try:
  from absl import flags as absl_flags
  from absl.flags import argparse_flags
except ImportError:
  # Fall back to argparse with no absl flags integration.
  absl_flags = None
  argparse_flags = argparse

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
  """Class for running TensorBoard.

  Fields:
    plugin_loaders: Set from plugins passed to constructor.
    assets_zip_provider: Set by constructor.
    server_class: Set by constructor.
    flags: An argparse.Namespace set by the configure() method.
  """

  def __init__(self,
               plugins=None,
               assets_zip_provider=None,
               server_class=None):
    """Creates new instance.

    Args:
      plugins: A list of TensorBoard plugins to load, as TBLoader instances or
        TBPlugin classes. If not specified, defaults to first-party plugins.
      assets_zip_provider: Delegates to TBContext or uses default if None.
      server_class: An optional subclass of TensorBoardServer to use for serving
        the TensorBoard WSGI app.

    :type plugins: list[Union[base_plugin.TBLoader, Type[base_plugin.TBPlugin]]]
    :type assets_zip_provider: () -> file
    :type server_class: class
    """
    if plugins is None:
      from tensorboard import default
      plugins = default.get_plugins()
    if assets_zip_provider is None:
      from tensorboard import default
      assets_zip_provider = default.get_assets_zip_provider()
    if server_class is None:
      server_class = WerkzeugServer
    def make_loader(plugin):
      if isinstance(plugin, base_plugin.TBLoader):
        return plugin
      if issubclass(plugin, base_plugin.TBPlugin):
        return base_plugin.BasicLoader(plugin)
      raise ValueError("Not a TBLoader or TBPlugin subclass: %s" % plugin)
    self.plugin_loaders = [make_loader(p) for p in plugins]
    self.assets_zip_provider = assets_zip_provider
    self.server_class = server_class
    self.flags = None

  def configure(self, argv=('',), **kwargs):
    """Configures TensorBoard behavior via flags.

    This method will populate the "flags" property with an argparse.Namespace
    representing flag values parsed from the provided argv list, overriden by
    explicit flags from remaining keyword arguments.

    Args:
      argv: Can be set to CLI args equivalent to sys.argv; the first arg is
        taken to be the name of the path being executed.
      kwargs: Additional arguments will override what was parsed from
        argv. They must be passed as Python data structures, e.g.
        `foo=1` rather than `foo="1"`.

    Returns:
      Either argv[:1] if argv was non-empty, or [''] otherwise, as a mechanism
      for absl.app.run() compatiblity.

    Raises:
      ValueError: If flag values are invalid.
    """
    parser = argparse_flags.ArgumentParser(
        prog='tensorboard',
        description=('TensorBoard is a suite of web applications for '
                     'inspecting and understanding your TensorFlow runs '
                     'and graphs. https://github.com/tensorflow/tensorboard '))
    for loader in self.plugin_loaders:
      loader.define_flags(parser)
    arg0 = argv[0] if argv else ''
    flags = parser.parse_args(argv[1:])  # Strip binary name from argv.
    if absl_flags and arg0:
      # Only expose main module Abseil flags as TensorBoard native flags.
      # This is the same logic Abseil's ArgumentParser uses for determining
      # which Abseil flags to include in the short helpstring.
      for flag in set(absl_flags.FLAGS.get_key_flags_for_module(arg0)):
        if hasattr(flags, flag.name):
          raise ValueError('Conflicting Abseil flag: %s' % flag.name)
        setattr(flags, flag.name, flag.value)
    for k, v in kwargs.items():
      if hasattr(flags, k):
        raise ValueError('Unknown TensorBoard flag: %s' % k)
      setattr(flags, k, v)
    for loader in self.plugin_loaders:
      loader.fix_flags(flags)
    self.flags = flags
    return [arg0]

  def main(self, ignored_argv=('',)):
    """Blocking main function for TensorBoard.

    This method is called by `tensorboard.main.run_main`, which is the
    standard entrypoint for the tensorboard command line program. The
    configure() method must be called first.

    Args:
      ignored_argv: Do not pass. Required for Abseil compatibility.

    Returns:
      Process exit code, i.e. 0 if successful or non-zero on failure. In
      practice, an exception will most likely be raised instead of
      returning non-zero.

    :rtype: int
    """
    if self.flags.inspect:
      logger.info('Not bringing up TensorBoard, but inspecting event files.')
      event_file = os.path.expanduser(self.flags.event_file)
      efi.inspect(self.flags.logdir, event_file, self.flags.tag)
      return 0
    try:
      server = self._make_server()
      sys.stderr.write('TensorBoard %s at %s (Press CTRL+C to quit)\n' %
                       (version.VERSION, server.get_url()))
      sys.stderr.flush()
      server.serve_forever()
      return 0
    except TensorBoardServerException as e:
      logger.error(e.msg)
      sys.stderr.write('ERROR: %s\n' % e.msg)
      sys.stderr.flush()
      return -1

  def launch(self):
    """Python API for launching TensorBoard.

    This method is the same as main() except it launches TensorBoard in
    a separate permanent thread. The configure() method must be called
    first.

    Returns:
      The URL of the TensorBoard web server.

    :rtype: str
    """
    # Make it easy to run TensorBoard inside other programs, e.g. Colab.
    server = self._make_server()
    thread = threading.Thread(target=server.serve_forever, name='TensorBoard')
    thread.daemon = True
    thread.start()
    return server.get_url()

  def _make_server(self):
    """Constructs the TensorBoard WSGI app and instantiates the server."""
    app = application.standard_tensorboard_wsgi(self.flags,
                                                self.plugin_loaders,
                                                self.assets_zip_provider)
    return self.server_class(app, self.flags)


class TensorBoardServer(object):
  """Class for customizing TensorBoard WSGI app serving."""
  __metaclass__ = ABCMeta

  @abstractmethod
  def __init__(self, wsgi_app, flags):
    """Create a flag-configured HTTP server for TensorBoard's WSGI app.

    Args:
      wsgi_app: The TensorBoard WSGI application to create a server for.
      flags: argparse.Namespace instance of TensorBoard flags.
    """
    raise NotImplementedError()

  @abstractmethod
  def serve_forever(self):
    """Blocking call to start serving the TensorBoard server."""
    raise NotImplementedError()

  @abstractmethod
  def get_url(self):
    """Returns a URL at which this server should be reachable."""
    raise NotImplementedError()


class TensorBoardServerException(Exception):
  """Exception raised by TensorBoardServer for user-friendly errors.

  Subclasses of TensorBoardServer can raise this exception in order to
  generate a clean error message for the user rather than a stacktrace.
  """
  def __init__(self, msg):
    self.msg = msg


class WerkzeugServer(TensorBoardServer):
  """Implementation of TensorBoardServer using the Werkzeug dev server."""

  def __init__(self, wsgi_app, flags):
    host = flags.host
    port = flags.port
    try:
      if host:
        # The user gave us an explicit host
        server = serving.make_server(host, port, wsgi_app, threaded=True)
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
          server = serving.make_server(host, port, wsgi_app, threaded=True)
        except socket.error:
          # If a blank host didn't work, we explicitly request IPv6 interfaces.
          server = serving.make_server('::', port, wsgi_app, threaded=True)
        final_host = socket.gethostname()
      server.daemon_threads = True
    except socket.error:
      if port == 0:
        msg = 'TensorBoard unable to find any open port'
      else:
        msg = (
            'TensorBoard attempted to bind to port %d, but it was already in use'
            % port)
      raise TensorBoardServerException(msg)
    server.handle_error = _handle_error
    final_port = server.socket.getsockname()[1]
    self._server = server
    self._url = 'http://%s:%d%s' % (final_host, final_port, flags.path_prefix)

  def serve_forever(self):
    self._server.serve_forever()

  def get_url(self):
    return self._url


# Kludge to override a SocketServer.py method so we can get rid of noisy
# EPIPE errors. They're kind of a red herring as far as errors go. For
# example, `curl -N http://localhost:6006/ | head` will cause an EPIPE.
def _handle_error(unused_request, client_address):
  exc_info = sys.exc_info()
  e = exc_info[1]
  if isinstance(e, IOError) and e.errno == errno.EPIPE:
    logger.warn('EPIPE caused by %s in HTTP serving' % client_address)
  else:
    logger.error('HTTP serving error', exc_info=exc_info)
