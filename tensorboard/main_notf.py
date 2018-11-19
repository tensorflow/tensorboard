# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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
"""TensorBoard main_notf module.

This module ties together `tensorboard.program` and plugins that don't require
TensorFlow to provide TensorBoard without a TensorFlow dependency. It's
meant to be tiny and act as little other than a config file. Those
wishing to customize the set of plugins or static assets that
TensorBoard uses can swap out this file with their own.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

# pylint: disable=g-import-not-at-top
# Disable the TF GCS filesystem cache which interacts pathologically with the
# pattern of reads used by TensorBoard for logdirs. See for details:
#   https://github.com/tensorflow/tensorboard/issues/1225
# This must be set before the first import of tensorflow.
import os
os.environ['GCS_READ_CACHE_DISABLED'] = '1'
# pylint: enable=g-import-not-at-top

import logging
import sys

from tensorboard import program
from tensorboard.plugins import base_plugin
from tensorboard.plugins.audio import audio_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.custom_scalar import custom_scalars_plugin
from tensorboard.plugins.distribution import distributions_plugin
from tensorboard.plugins.graph import graphs_plugin
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.image import images_plugin
from tensorboard.plugins.pr_curve import pr_curves_plugin
from tensorboard.plugins.projector import projector_plugin
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.text import text_plugin
from tensorboard.compat import tf


logger = logging.getLogger(__name__)

_NOTF_PLUGINS = [
    core_plugin.CorePluginLoader(),
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
]

def get_notf_plugins():
  """Returns a list specifying TensorBoard's default first-party plugins.

  Plugins are specified in this list either via a TBLoader instance to load the
  plugin, or the TBPlugin class itself which will be loaded using a BasicLoader.

  This list can be passed to the `tensorboard.program.TensorBoard` API.

  :rtype: list[Union[base_plugin.TBLoader, Type[base_plugin.TBPlugin]]]
  """
  return _NOTF_PLUGINS[:]

def run_main():
  """Initializes flags and calls main()."""
  program.setup_environment()
  tensorboard = program.TensorBoard(get_notf_plugins(),
                                    program.get_default_assets_zip_provider())
  try:
    from absl import app
    # Import this to check that app.run() will accept the flags_parser argument.
    from absl.flags import argparse_flags
    app.run(tensorboard.main, flags_parser=tensorboard.configure)
    raise AssertionError("absl.app.run() shouldn't return")
  except ImportError:
    pass
  tensorboard.configure(sys.argv)
  sys.exit(tensorboard.main())


if __name__ == '__main__':
  run_main()
