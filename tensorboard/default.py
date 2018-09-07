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
"""Collection of first-party plugins.

This module exists to isolate tensorboard.program from the potentially
heavyweight build dependencies for first-party plugins. This way people
doing custom builds of TensorBoard have the option to only pay for the
dependencies they want.

This module also grants the flexibility to those doing custom builds, to
automatically inherit the centrally-maintained list of standard plugins,
for less repetition.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import logging
import os

import tensorflow as tf

from tensorboard.plugins import base_plugin
from tensorboard.plugins.audio import audio_plugin
from tensorboard.plugins.beholder import beholder_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.custom_scalar import custom_scalars_plugin
from tensorboard.plugins.distribution import distributions_plugin
from tensorboard.plugins.graph import graphs_plugin
from tensorboard.plugins.debugger import debugger_plugin_loader
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.image import images_plugin
from tensorboard.plugins.interactive_inference import interactive_inference_plugin
from tensorboard.plugins.pr_curve import pr_curves_plugin
from tensorboard.plugins.profile import profile_plugin
from tensorboard.plugins.projector import projector_plugin
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.text import text_plugin

logger = logging.getLogger(__name__)

_PLUGINS = [
    core_plugin.CorePluginLoader(),
    beholder_plugin.BeholderPlugin,
    scalars_plugin.ScalarsPlugin,
    custom_scalars_plugin.CustomScalarsPlugin,
    images_plugin.ImagesPlugin,
    audio_plugin.AudioPlugin,
    graphs_plugin.GraphsPlugin,
    distributions_plugin.DistributionsPlugin,
    histograms_plugin.HistogramsPlugin,
    pr_curves_plugin.PrCurvesPlugin,
    projector_plugin.ProjectorPlugin,
    text_plugin.TextPlugin,
    interactive_inference_plugin.InteractiveInferencePlugin,
    profile_plugin.ProfilePluginLoader(),
    debugger_plugin_loader.DebuggerPluginLoader(),
]

def get_plugins():
  """Returns a list specifying TensorBoard's default first-party plugins.

  Plugins are specified in this list either via a TBLoader instance to load the
  plugin, or the TBPlugin class itself which will be loaded using a BasicLoader.

  This list can be passed to the `tensorboard.program.TensorBoard` API.

  :rtype: list[Union[base_plugin.TBLoader, Type[base_plugin.TBPlugin]]]
  """
  return _PLUGINS[:]

def get_assets_zip_provider():
  """Opens stock TensorBoard web assets collection.

  Returns:
    Returns function that returns a newly opened file handle to zip file
    containing static assets for stock TensorBoard, or None if webfiles.zip
    could not be found. The value the callback returns must be closed. The
    paths inside the zip file are considered absolute paths on the web server.
  """
  path = os.path.join(tf.resource_loader.get_data_files_path(), 'webfiles.zip')
  if not os.path.exists(path):
    logger.warning('webfiles.zip static assets not found: %s', path)
    return None
  return lambda: open(path, 'rb')
