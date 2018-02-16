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
    'debugger_data_server_grpc_port', -1,
    'The port at which the non-interactive debugger data server '
    'should receive debugging data via gRPC from one '
    'or more debugger-enabled TensorFlow runtimes. No debugger plugin or '
    'debugger data server will be started if this flag is not provided. This '
    'flag differs from the `--debugger_port` flag in that it starts a '
    'non-interactive mode. It is for use with the "health pills" feature '
    'of the Graph Dashboard. This flag is mutually exclusive with '
    '`--debugger_port`.')
tf.flags.DEFINE_integer(
    'debugger_port', -1,
    'The port at which the interactive debugger data server (to be started by '
    'the debugger plugin) should receive debugging data via gRPC from one or '
    'more debugger-enabled TensorFlow runtimes. No debugger plugin or debugger '
    'data server will be started if this flag is not provided. This flag '
    'differs from the `--debugger_data_server_grpc_port` flag in that it '
    'starts an interactive mode that allows user to pause at selected nodes '
    'inside a TensorFlow Graph or between Session.runs. It is for use with the '
    'interactive Debugger Dashboard. This flag is mutually exclusive with '
    '`--debugger_data_server_grpc_port`.')

FLAGS = tf.flags.FLAGS


def get_debugger_plugin():
  """Returns the debugger plugin, if possible.

  This function can be passed along to the functions in
  `tensorboard.program`.

  Returns:
    The TBPlugin constructor for the debugger plugin, or None if
    the necessary flag was not set.

  Raises:
    ValueError: If both the `debugger_data_server_grpc_port` and `debugger_port`
      flags are specified as >= 0.
  """
  # Check that not both grpc port flags are specified.
  if FLAGS.debugger_data_server_grpc_port > 0 and FLAGS.debugger_port > 0:
    raise ValueError(
        '--debugger_data_server_grpc_port and --debugger_port are mutually '
        'exclusive. Do not use both of them at the same time.')

  if FLAGS.debugger_data_server_grpc_port > 0 or FLAGS.debugger_port > 0:
    return _ConstructDebuggerPluginWithGrpcPort
  return None


def _ConstructDebuggerPluginWithGrpcPort(context):
  try:
    # pylint: disable=line-too-long,g-import-not-at-top
    from tensorboard.plugins.debugger import debugger_plugin as debugger_plugin_lib
    from tensorboard.plugins.debugger import interactive_debugger_plugin as interactive_debugger_plugin_lib
    # pylint: enable=line-too-long,g-import-not-at-top
  except ImportError as e:
    e_type, e_value, e_traceback = sys.exc_info()
    message = e.msg if hasattr(e, 'msg') else e.message  # Handle py2 vs py3
    if 'grpc' in message:
      e_value = ImportError(
          message +
          '\n\nTo use the debugger plugin, you need to have '
          'gRPC installed:\n  pip install grpcio')
    six.reraise(e_type, e_value, e_traceback)

  if FLAGS.debugger_port > 0:
    interactive_plugin = (
        interactive_debugger_plugin_lib.InteractiveDebuggerPlugin(context))
    tf.logging.info('Starting Interactive Debugger Plugin at gRPC port %d',
                    FLAGS.debugger_data_server_grpc_port)
    interactive_plugin.listen(FLAGS.debugger_port)
    return interactive_plugin
  elif FLAGS.debugger_data_server_grpc_port > 0:
    noninteractive_plugin = debugger_plugin_lib.DebuggerPlugin(context)
    tf.logging.info('Starting Non-interactive Debugger Plugin at gRPC port %d',
                    FLAGS.debugger_data_server_grpc_port)
    noninteractive_plugin.listen(FLAGS.debugger_data_server_grpc_port)
    return noninteractive_plugin
  return None
