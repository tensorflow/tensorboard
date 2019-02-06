"""Classes and functions for handling the GetExperiment API call."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


from tensorboard.plugins.hparams import error


class Handler(object):
  """Handles a GetExperiment request. """

  def __init__(self, context):
    """Constructor.

    Args:
      context: A backend_context.Context instance.
    """
    self._context = context

  def run(self):
    """Handles the request specified on construction.

    Returns:
      An Experiment object.

    """
    experiment = self._context.experiment()
    if experiment is None:
      raise error.HParamsError(
          "Can't find an HParams-plugin experiment data in"
          " the log directory. Note that it takes some time to"
          " scan the log directory; if you just started"
          " Tensorboard it could be that we haven't finished"
          " scanning it yet. Consider trying again in a"
          " few seconds.")
    return experiment
