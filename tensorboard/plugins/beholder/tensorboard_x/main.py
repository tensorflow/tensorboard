# Copyright 2017 Google Inc. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import logging
import os

from tensorboard import util
from tensorboard import main as tb_main
from tensorboard.plugins.audio import audio_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.distribution import distributions_plugin
from tensorboard.plugins.graph import graphs_plugin
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.image import images_plugin
from tensorboard.plugins.profile import profile_plugin
from tensorboard.plugins.projector import projector_plugin
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.text import text_plugin
import tensorflow as tf

from beholder.server_side import beholder_plugin


def get_assets_zip_provider():
  path = os.path.join(tf.resource_loader.get_data_files_path(), 'assets.zip')
  return lambda: open(path, 'rb')


def get_plugins():
  return [
      beholder_plugin.BeholderPlugin,
      core_plugin.CorePlugin,
      scalars_plugin.ScalarsPlugin,
      images_plugin.ImagesPlugin,
      audio_plugin.AudioPlugin,
      graphs_plugin.GraphsPlugin,
      distributions_plugin.DistributionsPlugin,
      histograms_plugin.HistogramsPlugin,
      projector_plugin.ProjectorPlugin,
      text_plugin.TextPlugin,
      profile_plugin.ProfilePlugin,
  ]


def main(unused_argv=None):
  util.setup_logging()
  tb_app = tb_main.create_tb_app(
      assets_zip_provider=get_assets_zip_provider(),
      plugins=get_plugins())

  server, url = tb_main.make_simple_server(tb_app)

  logger = logging.getLogger('tensorflow' + util.LogHandler.EPHEMERAL)
  logger.setLevel(logging.INFO)
  logger.info('TensorBoard-X (Beholder) 0.1 at %s (CTRL+C to quit)', url)

  try:
    server.serve_forever()
  finally:
    logger.info('')


if __name__ == '__main__':
  tf.app.run()
