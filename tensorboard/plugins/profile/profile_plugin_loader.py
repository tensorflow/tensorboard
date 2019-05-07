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
"""Wrapper around plugin to conditionally enable it."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.plugins import base_plugin


class ProfilePluginLoader(base_plugin.TBLoader):
  """ProfilePlugin factory.

  This class checks for `tensorflow` install and dependency.
  """

  def define_flags(self, parser):
    group = parser.add_argument_group('profile plugin')
    group.add_argument(
        '--master_tpu_unsecure_channel',
        metavar='ADDR',
        type=str,
        default='',
        help='''\
IP address of "master tpu", used for getting streaming trace data
through tpu profiler analysis grpc. The grpc channel is not secured.\
''')

  def load(self, context):
    """Returns the plugin, if possible.

    Args:
      context: The TBContext flags.

    Returns:
      A ProfilePlugin instance or None if it couldn't be loaded.
    """
    try:
      # pylint: disable=g-import-not-at-top,unused-import
      import tensorflow
      # Available in TensorFlow 1.14 or later, so do import check
      # pylint: disable=g-import-not-at-top,unused-import
      from tensorflow.python.eager import profiler_client
    except ImportError:
      return
    # pylint: disable=g-import-not-at-top
    from tensorboard.plugins.profile.profile_plugin import ProfilePlugin
    return ProfilePlugin(context)
