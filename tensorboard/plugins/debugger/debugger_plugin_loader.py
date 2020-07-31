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
"""Wrapper around debugger plugin to conditionally enable it."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.debugger import constants
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()


class InactiveDebuggerPlugin(base_plugin.TBPlugin):
    """A placeholder debugger plugin used when no grpc port is specified."""

    plugin_name = constants.DEBUGGER_PLUGIN_NAME

    def __init__(self):
        pass

    def is_active(self):
        return False

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            element_name="tf-debugger-dashboard"
        )

    def get_plugin_apps(self):
        return {
            "/debugger_grpc_host_port": self._serve_debugger_grpc_host_port,
        }

    @wrappers.Request.application
    def _serve_debugger_grpc_host_port(self, request):
        # Respond with a -1 port number to indicate the debugger plugin is
        # inactive.
        return http_util.Respond(
            request, {"host": None, "port": -1}, "application/json"
        )


class DebuggerPluginLoader(base_plugin.TBLoader):
    """DebuggerPlugin factory factory.

    This class determines which debugger plugin to load, based on custom
    flags. It also checks for the `grpcio` PyPi dependency.
    """

    def define_flags(self, parser):
        """Adds DebuggerPlugin CLI flags to parser."""
        group = parser.add_argument_group("debugger plugin")
        group.add_argument(
            "--debugger_data_server_grpc_port",
            metavar="PORT",
            type=int,
            default=-1,
            help="""\
The port at which the non-interactive debugger data server should
receive debugging data via gRPC from one or more debugger-enabled
TensorFlow runtimes. No debugger plugin or debugger data server will be
started if this flag is not provided. This flag differs from the
`--debugger_port` flag in that it starts a non-interactive mode. It is
for use with the "health pills" feature of the Graph Dashboard. This
flag is mutually exclusive with `--debugger_port`.\
""",
        )
        group.add_argument(
            "--debugger_port",
            metavar="PORT",
            type=int,
            default=-1,
            help="""\
The port at which the interactive debugger data server (to be started by
the debugger plugin) should receive debugging data via gRPC from one or
more debugger-enabled TensorFlow runtimes. No debugger plugin or
debugger data server will be started if this flag is not provided. This
flag differs from the `--debugger_data_server_grpc_port` flag in that it
starts an interactive mode that allows user to pause at selected nodes
inside a TensorFlow Graph or between Session.runs. It is for use with
the interactive Debugger Dashboard. This flag is mutually exclusive with
`--debugger_data_server_grpc_port`.\
""",
        )

    def fix_flags(self, flags):
        """Fixes Debugger related flags.

        Raises:
          ValueError: If both the `debugger_data_server_grpc_port` and
            `debugger_port` flags are specified as >= 0.
        """
        # Check that not both grpc port flags are specified.
        if flags.debugger_data_server_grpc_port > 0 and flags.debugger_port > 0:
            raise base_plugin.FlagsError(
                "--debugger_data_server_grpc_port and --debugger_port are mutually "
                "exclusive. Do not use both of them at the same time."
            )

    def load(self, context):
        """Returns the debugger plugin, if possible.

        Args:
          context: The TBContext flags including `add_arguments`.

        Returns:
          A DebuggerPlugin instance or None if it couldn't be loaded.
        """
        flags = context.flags
        if flags.debugger_data_server_grpc_port > 0 or flags.debugger_port > 0:
            # Verify that the required Python packages are installed.
            try:
                # pylint: disable=unused-import
                import tensorflow  # noqa: F401
            except ImportError:
                raise ImportError(
                    "To use the debugger plugin, you need to have TensorFlow installed:\n"
                    "  pip install tensorflow"
                )

        if flags.debugger_data_server_grpc_port > 0:
            from tensorboard.plugins.debugger import (
                debugger_plugin as debugger_plugin_lib,
            )

            # debugger_data_server_grpc opens the non-interactive Debugger Plugin,
            # which appears as health pills in the Graph Plugin.
            noninteractive_plugin = debugger_plugin_lib.DebuggerPlugin(context)
            logger.info(
                "Starting Non-interactive Debugger Plugin at gRPC port %d",
                flags.debugger_data_server_grpc_port,
            )
            noninteractive_plugin.listen(flags.debugger_data_server_grpc_port)
            return noninteractive_plugin
        elif flags.debugger_port > 0:
            from tensorboard.plugins.debugger import (
                interactive_debugger_plugin as interactive_debugger_plugin_lib,
            )

            interactive_plugin = interactive_debugger_plugin_lib.InteractiveDebuggerPlugin(
                context
            )
            logger.info(
                "Starting Interactive Debugger Plugin at gRPC port %d",
                flags.debugger_data_server_grpc_port,
            )
            interactive_plugin.listen(flags.debugger_port)
            return interactive_plugin
        else:
            # If neither the debugger_data_server_grpc_port flag or the grpc_port
            # flag is specified, we instantiate a dummy plugin as a placeholder for
            # the frontend. The dummy plugin will display a message indicating that
            # the plugin is not active. It'll also display a command snippet to
            # illustrate how to activate the interactive Debugger Plugin.
            return InactiveDebuggerPlugin()
