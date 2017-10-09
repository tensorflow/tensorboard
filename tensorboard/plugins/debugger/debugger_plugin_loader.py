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

import sys

import six
import tensorflow as tf

tf.flags.DEFINE_integer(
    'debugger_data_server_grpc_port', None,
    'The port at which the debugger data server (to be started by the debugger '
    'plugin) should receive debugging data via gRPC from one or more '
    'debugger-enabled TensorFlow runtimes. No debugger plugin or debugger data '
    'server will be started if this flag is not provided.')

FLAGS = tf.flags.FLAGS


def get_debugger_plugin():
  """Returns the debugger plugin, if possible.

  This function can be passed along to the functions in
  `tensorboard.program`.

  Returns:
    The TBPlugin constructor for the debugger plugin, or None if
    the necessary flag was not set.
  """
  if FLAGS.debugger_data_server_grpc_port is None:
    return None
  return _ConstructDebuggerPluginWithGrpcPort


def _ConstructDebuggerPluginWithGrpcPort(context):
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
            "\n\nTo use the debugger plugin, you need to have "
            "gRPC installed:\n  pip install grpcio"),
        traceback)
  tf.logging.info("Starting Debugger Plugin at gRPC port %d",
                  FLAGS.debugger_data_server_grpc_port)
  debugger_plugin = debugger_plugin_lib.DebuggerPlugin(context)
  debugger_plugin.listen(FLAGS.debugger_data_server_grpc_port)
  return debugger_plugin
