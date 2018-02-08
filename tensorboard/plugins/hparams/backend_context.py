
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six

from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import error

class Context:
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
    for (run, tag_to_content) in six.iteritems(mapping):
      if metadata.EXPERIMENT_TAG in tag_to_content:
        return metadata.parse_plugin_data_as(
            tag_to_content[metadata.EXPERIMENT_TAG], "experiment")

    raise error.HParamsError('Could not find a run containing tag: %s'
                             % metadata.EXPERIMENT_TAG)
