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
from collections import defaultdict
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
      for absl.app.run() compatibility.

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


class WerkzeugServer(serving.ThreadedWSGIServer, TensorBoardServer):
  """Implementation of TensorBoardServer using the Werkzeug dev server."""
  # ThreadedWSGIServer handles this in werkzeug 0.12+ but we allow 0.11.x.
  daemon_threads = True

  def __init__(self, wsgi_app, flags):
    self._flags = flags
    host = flags.host
    self._auto_wildcard = False
    if not host:
      # Without an explicit host, we default to serving on all interfaces,
      # and will attempt to serve both IPv4 and IPv6 traffic through one socket.
      host = self._get_wildcard_address(flags.port)
      self._auto_wildcard = True
    try:
      super(WerkzeugServer, self).__init__(host, flags.port, wsgi_app)
    except socket.error as e:
      if hasattr(errno, 'EACCES') and e.errno == errno.EACCES:
        raise TensorBoardServerException(
            'TensorBoard must be run as superuser to bind to port %d' %
            flags.port)
      elif hasattr(errno, 'EADDRINUSE') and e.errno == errno.EADDRINUSE:
        if flags.port == 0:
          raise TensorBoardServerException(
              'TensorBoard unable to find any open port')
        else:
          raise TensorBoardServerException(
              'TensorBoard could not bind to port %d, it was already in use' %
              flags.port)
      elif hasattr(errno, 'EADDRNOTAVAIL') and e.errno == errno.EADDRNOTAVAIL:
        raise TensorBoardServerException(
            'TensorBoard could not bind to unavailable address %s' % host)
      elif hasattr(errno, 'EAFNOSUPPORT') and e.errno == errno.EAFNOSUPPORT:
        raise TensorBoardServerException(
            'Tensorboard could not bind to unsupported address family %s' %
            host)
      # Raise the raw exception if it wasn't identifiable as a user error.
      raise

  def _get_wildcard_address(self, port):
    """Returns a wildcard address for the port in question.

    This will attempt to follow the best practice of calling getaddrinfo() with
    a null host and AI_PASSIVE to request a server-side socket wildcard address.
    If that succeeds, this returns the first IPv6 address found, or if none,
    then returns the first IPv4 address. If that fails, then this returns the
    hardcoded address "::" if socket.has_ipv6 is True, else "0.0.0.0".
    """
    fallback_address = '::' if socket.has_ipv6 else '0.0.0.0'
    if hasattr(socket, 'AI_PASSIVE'):
      try:
        addrinfos = socket.getaddrinfo(None, port, socket.AF_UNSPEC,
                                       socket.SOCK_STREAM, socket.IPPROTO_TCP,
                                       socket.AI_PASSIVE)
      except socket.gaierror as e:
        logger.warn('Failed to auto-detect wildcard address, assuming %s: %s',
                    fallback_address, str(e))
        return fallback_address
      addrs_by_family = defaultdict(list)
      for family, _, _, _, sockaddr in addrinfos:
        # Format of the "sockaddr" socket address varies by address family,
        # but [0] is always the IP address portion.
        addrs_by_family[family].append(sockaddr[0])
      if hasattr(socket, 'AF_INET6') and addrs_by_family[socket.AF_INET6]:
        return addrs_by_family[socket.AF_INET6][0]
      if hasattr(socket, 'AF_INET') and addrs_by_family[socket.AF_INET]:
        return addrs_by_family[socket.AF_INET][0]
    logger.warn('Failed to auto-detect wildcard address, assuming %s',
                fallback_address)
    return fallback_address

  def server_bind(self):
    """Override to enable IPV4 mapping for IPV6 sockets when desired.

    The main use case for this is so that when no host is specified, TensorBoard
    can listen on all interfaces for both IPv4 and IPv6 connections, rather than
    having to choose v4 or v6 and hope the browser didn't choose the other one.
    """
    socket_is_v6 = (
        hasattr(socket, 'AF_INET6') and self.socket.family == socket.AF_INET6)
    has_v6only_option = (
        hasattr(socket, 'IPPROTO_IPV6') and hasattr(socket, 'IPV6_V6ONLY'))
    if self._auto_wildcard and socket_is_v6 and has_v6only_option:
      try:
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
      except socket.error as e:
        # Log a warning on failure to dual-bind, except for EAFNOSUPPORT
        # since that's expected if IPv4 isn't supported at all (IPv6-only).
        if hasattr(errno, 'EAFNOSUPPORT') and e.errno != errno.EAFNOSUPPORT:
          logging.warn('Failed to dual-bind to IPv4 wildcard: %s', str(e))
    super(WerkzeugServer, self).server_bind()

  def handle_error(self, request, client_address):
    """Override to get rid of noisy EPIPE errors."""
    del request  # unused
    # Kludge to override a SocketServer.py method so we can get rid of noisy
    # EPIPE errors. They're kind of a red herring as far as errors go. For
    # example, `curl -N http://localhost:6006/ | head` will cause an EPIPE.
    exc_info = sys.exc_info()
    e = exc_info[1]
    if isinstance(e, IOError) and e.errno == errno.EPIPE:
      logger.warn('EPIPE caused by %s in HTTP serving' % str(client_address))
    else:
      logger.error('HTTP serving error', exc_info=exc_info)

  def get_url(self):
    if self._auto_wildcard:
      display_host = socket.gethostname()
    else:
      host = self._flags.host
      display_host = (
          '[%s]' % host if ':' in host and not host.startswith('[') else host)
    return 'http://%s:%d%s' % (display_host, self.server_port,
                               self._flags.path_prefix)
