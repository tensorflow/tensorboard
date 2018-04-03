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
from tensorboard.plugins.hparams import error

class Context(object):
  """Stores data shared across API handlers for the HParams plugin backend."""
  def __init__(self, multiplexer):
    """Instantiates a context.
    Args:
      multiplexer: A plugin_event_multiplexer.EventMultiplexer instance
        accessing the currently loaded runs and tags.
    """
    self._experiment = None
    self._multiplexer = multiplexer

  def experiment(self):
    # Note: We can't search for the experiment in the constructor,
    # since this object may be initialized before Tensorboard reads
    # the event data.
    if self._experiment is None:
      self._experiment = self._find_experiment()
    return self._experiment

  def multiplexer(self):
    return self._multiplexer

  def _find_experiment(self):
    mapping = self._multiplexer.PluginRunToTagToContent(
        metadata.PLUGIN_NAME)
    for tag_to_content in mapping.values():
      if metadata.EXPERIMENT_TAG in tag_to_content:
        return metadata.parse_experiment_plugin_data(
            tag_to_content[metadata.EXPERIMENT_TAG])

    raise error.HParamsError('Could not find a run containing tag: %s'
                             % metadata.EXPERIMENT_TAG)
