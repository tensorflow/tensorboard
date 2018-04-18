# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.plugins.hparams import metadata

class Context(object):
  """Wraps the base_plugin.TBContext to stores additional data shared across
  API handlers for the HParams plugin backend."""
  def __init__(self, tb_context):
    """Instantiates a context.
    Args:
      tb_context: base_plugin.TBContext. The "base" context we extend.
    """
    self._tb_context = tb_context
    self._experiment = None

  def experiment(self):
    """Searches for the experiment tag and returns the associated experiment
    protobuffer. If no tag is found (possibly, because the event data has not
    been completely loaded yet), returns None.
    """
    if self._experiment is None:
      self._experiment = self._find_experiment()
    return self._experiment

  @property
  def multiplexer(self):
    return self._tb_context.multiplexer

  @property
  def tb_context(self):
    return self._tb_context

  def _find_experiment(self):
    mapping = self.multiplexer.PluginRunToTagToContent(
        metadata.PLUGIN_NAME)
    for tag_to_content in mapping.values():
      if metadata.EXPERIMENT_TAG in tag_to_content:
        return metadata.parse_experiment_plugin_data(
            tag_to_content[metadata.EXPERIMENT_TAG])
    return None
