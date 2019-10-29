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


class InteractiveInferencePluginLoader(base_plugin.TBLoader):
  """InteractiveInferencePlugin factory.

  This class checks for `tensorflow` install and dependency.
  """

  def load(self, context):
    """Returns the plugin, if possible.

    Args:
      context: The TBContext flags.

    Returns:
      A InteractiveInferencePlugin instance or None if it couldn't be loaded.
    """
    try:
      # pylint: disable=g-import-not-at-top,unused-import
      import tensorflow
    except ImportError:
      return
    # pylint: disable=line-too-long,g-import-not-at-top
    from tensorboard.plugins.interactive_inference.interactive_inference_plugin import InteractiveInferencePlugin
    return InteractiveInferencePlugin(context)
