# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Provides data ingestion logic backed by a gRPC server."""

import errno
import logging
import os
import subprocess
import tempfile
import time

import grpc

from tensorboard.data import grpc_provider
from tensorboard.data import ingester
from tensorboard.util import tb_logging


logger = tb_logging.get_logger()

# If this environment variable is non-empty, it will be used as the path to the
# data server binary rather than using a bundled version.
_ENV_DATA_SERVER_BINARY = "TENSORBOARD_DATA_SERVER_BINARY"


class ExistingServerDataIngester(ingester.DataIngester):
    """Connect to an already running gRPC server."""

    def __init__(self, address, *, channel_creds_type):
        """Initializes an ingester with the given configuration.

        Args:
          address: String, as passed to `--grpc_data_provider`.
          channel_creds_type: `grpc_util.ChannelCredsType`, as passed to
            `--grpc_creds_type`.
        """
        self._data_provider = _make_provider(address, channel_creds_type)

    @property
    def data_provider(self):
        return self._data_provider

    def start(self):
        pass


class SubprocessServerDataIngester(ingester.DataIngester):
    """Start a new data server as a subprocess."""

    def __init__(self, logdir, *, reload_interval, channel_creds_type):
        """Initializes an ingester with the given configuration.

        Args:
          logdir: String, as passed to `--logdir`.
          reload_interval: Number, as passed to `--reload_interval`.
          channel_creds_type: `grpc_util.ChannelCredsType`, as passed to
            `--grpc_creds_type`.
        """
        self._data_provider = None
        self._logdir = logdir
        self._reload_interval = reload_interval
        self._channel_creds_type = channel_creds_type

    @property
    def data_provider(self):
        if self._data_provider is None:
            raise RuntimeError("Must call `start` first")
        return self._data_provider

    def start(self):
        if self._data_provider:
            return
        server_binary = _get_server_binary()

        tmpdir = tempfile.TemporaryDirectory(prefix="tensorboard_data_server_")
        port_file_path = os.path.join(tmpdir.name, "port")

        if self._reload_interval <= 0:
            reload = "once"
        else:
            reload = str(int(self._reload_interval))

        args = [
            server_binary,
            "--logdir=%s" % (self._logdir,),
            "--reload=%s" % reload,
            "--port=0",
            "--port-file=%s" % (port_file_path,),
            "--die-after-stdin",
        ]
        if logger.isEnabledFor(logging.INFO):
            args.append("--verbose")
        if logger.isEnabledFor(logging.DEBUG):
            args.append("--verbose")  # Repeat arg to increase verbosity.

        logger.info("Spawning data server: %r", args)
        popen = subprocess.Popen(args, stdin=subprocess.PIPE)
        # Stash stdin to avoid calling its destructor: on Windows, this
        # is a `subprocess.Handle` that closes itself in `__del__`,
        # which would cause the data server to shut down. (This is not
        # documented; you have to read CPython source to figure it out.)
        # We want that to happen at end of process, but not before.
        self._stdin_handle = popen.stdin  # stash to avoid stdin being closed

        port = None
        # The server only needs about 10 microseconds to spawn on my machine,
        # but give a few orders of magnitude of padding, and then poll.
        time.sleep(0.01)
        for i in range(20):
            if popen.poll() is not None:
                raise RuntimeError(
                    "Data server exited with %d; check stderr for details"
                    % popen.poll()
                )
            logger.info("Polling for data server port (attempt %d)", i)
            port_file_contents = None
            try:
                with open(port_file_path) as infile:
                    port_file_contents = infile.read()
            except OSError as e:
                if e.errno != errno.ENOENT:
                    raise
            logger.info("Port file contents: %r", port_file_contents)
            if (port_file_contents or "").endswith("\n"):
                port = int(port_file_contents)
                break
            # Else, not done writing yet.
            time.sleep(0.5)
        if port is None:
            raise RuntimeError(
                "Timed out while waiting for data server to start. "
                "It may still be running as pid %d." % popen.pid
            )

        addr = "localhost:%d" % port
        self._data_provider = _make_provider(addr, self._channel_creds_type)
        logger.info(
            "Established connection to data server at pid %d via %s",
            popen.pid,
            addr,
        )


def _make_provider(addr, channel_creds_type):
    (creds, options) = channel_creds_type.channel_config()
    options.append(("grpc.max_receive_message_length", 1024 * 1024 * 256))
    channel = grpc.secure_channel(addr, creds, options=options)
    stub = grpc_provider.make_stub(channel)
    return grpc_provider.GrpcDataProvider(addr, stub)


def _get_server_binary():
    """Get path to data server binary or raise `RuntimeError`."""
    env_result = os.environ.get(_ENV_DATA_SERVER_BINARY)
    if env_result:
        logging.info("Server binary (from env): %s", env_result)
        if not os.path.isfile(env_result):
            raise RuntimeError(
                "Found environment variable %s=%s, but no such file exists."
                % (_ENV_DATA_SERVER_BINARY, env_result)
            )
        return env_result

    bundle_result = os.path.join(os.path.dirname(__file__), "server", "server")
    if os.path.exists(bundle_result):
        logging.info("Server binary (from bundle): %s", bundle_result)
        return bundle_result

    try:
        import tensorboard_data_server
    except ImportError:
        pass
    else:
        pkg_result = tensorboard_data_server.server_binary()
        logging.info("Server binary (from Python package): %s", pkg_result)
        if pkg_result is None:
            raise RuntimeError(
                "TensorBoard data server not supported on this platform."
            )
        return pkg_result

    raise RuntimeError(
        "TensorBoard data server not found. This mode is experimental. "
        "If building from source, pass --define=link_data_server=true."
    )
