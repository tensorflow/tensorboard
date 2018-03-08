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

This module exists to isolate tensorboard.server from the potentially
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

import os

import tensorflow as tf

from tensorboard.plugins.audio import audio_plugin
from tensorboard.plugins.beholder import beholder_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.custom_scalar import custom_scalars_plugin
from tensorboard.plugins.distribution import distributions_plugin
from tensorboard.plugins.graph import graphs_plugin
from tensorboard.plugins.debugger import debugger_plugin_loader
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.image import images_plugin
from tensorboard.plugins.pr_curve import pr_curves_plugin
from tensorboard.plugins.profile import profile_plugin
from tensorboard.plugins.projector import projector_plugin
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.text import text_plugin


def get_plugins():
  """Returns list of TensorBoard's first-party TBPlugin classes.

  This list can then be passed to functions in `tensorboard.server` or
  `tensorboard.backend.application`.

  :rtype: list[:class:`base_plugin.TBPlugin`]
  """
  plugins = [
      beholder_plugin.BeholderPlugin,
      core_plugin.CorePlugin,
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
      profile_plugin.ProfilePlugin,
  ]
  # The debugger plugin is only activated if its flag is set.
  debugger = debugger_plugin_loader.get_debugger_plugin()
  if debugger is not None:
    plugins.append(debugger)
  return plugins


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
    tf.logging.warning('webfiles.zip static assets not found: %s', path)
    return None
  return lambda: open(path, 'rb')
