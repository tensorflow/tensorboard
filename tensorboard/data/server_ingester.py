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

import logging
import os
import re
import select
import subprocess
import time

import grpc

from tensorboard import ingester
from tensorboard.data import grpc_provider
from tensorboard.util import tb_logging


logger = tb_logging.get_logger()

_RE_PORT = re.compile("listening on port ([0-9]+)")


class ServerDataIngester(ingester.DataIngester):
    """Data ingestion implementation to use when against a gRPC server."""

    def __init__(self, flags):
        address = flags.grpc_data_provider
        if address:
            # Connect to an existing server at the given address.
            self._data_provider = _make_provider(address)
            return
        if not flags.load_fast:
            raise ingester.NotApplicableError(
                "Neither `--load_fast` nor `--grpc_data_provider` given"
            )
        self._flags = flags
        self._data_provider = None

    @property
    def data_provider(self):
        if self._data_provider is None:
            raise RuntimeError("Must call `start` first")
        return self._data_provider

    @property
    def deprecated_multiplexer(self):
        return None

    def start(self):
        if self._data_provider:
            return
        server_binary = os.path.join(
            os.path.dirname(__file__), "server", "server"
        )
        logger.info("Data server binary: %s", server_binary)
        if not os.path.exists(server_binary):
            raise RuntimeError(
                "TensorBoard data server not found. This mode is experimental "
                "and not supported in release builds. If building from source, "
                "pass --define=link_data_server=true."
            )
        args = [
            server_binary,
            "--logdir=%s" % (self._flags.logdir,),
            "--port=0",
            "--die-after-stdin",
        ]
        if logger.isEnabledFor(logging.INFO):
            args.append("--verbose")

        logger.warn("Spawning data server: %r", args)
        popen = subprocess.Popen(
            args, stdin=subprocess.PIPE, stdout=subprocess.PIPE
        )
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
        poller = select.poll()
        poller.register(popen.stdout, select.POLLIN)
        for i in range(20):
            if popen.poll() is not None:
                raise RuntimeError(
                    "Data server exited with %d; check stderr for details"
                    % popen.poll()
                )
            logger.info("Polling for data server port (attempt %d)", i)
            if poller.poll(0):
                line = next(popen.stdout)
                logger.info("Data server stdout line: %r", line)
                match = _RE_PORT.match(line.decode(errors="replace"))
                if match:
                    port = int(match.group(1))
                    break
            time.sleep(0.5)
        if port is None:
            raise RuntimeError(
                "Timed out while waiting for data server to start. "
                "It may still be running as pid %d." % popen.pid
            )

        addr = "localhost:%d" % port
        self._data_provider = _make_provider(addr)
        logger.info(
            "Established connection to data server at pid %d via %s",
            popen.pid,
            addr,
        )


def _make_provider(addr):
    options = [
        ("grpc.max_receive_message_length", 1024 * 1024 * 256),
    ]
    channel = grpc.insecure_channel(addr, options=options)
    stub = grpc_provider.make_stub(channel)
    return grpc_provider.GrpcDataProvider(addr, stub)
