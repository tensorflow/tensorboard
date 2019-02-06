"""Classes and functions for handling the ListMetricEvals API call."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.plugins.hparams import metrics
from tensorboard.plugins.scalar import scalars_plugin


class Handler(object):
  """Handles a ListMetricEvals request. """

  def __init__(self, request, scalars_plugin_instance):
    """Constructor.

    Args:
      request: A ListSessionGroupsRequest protobuf.
      scalars_plugin_instance: A scalars_plugin.ScalarsPlugin.
    """
    self._request = request
    self._scalars_plugin_instance = scalars_plugin_instance

  def run(self):
    """Executes the request.

    Returns:
       An array of tuples representing the metric evaluations--each of the form
       (<wall time in secs>, <training step>, <metric value>).
    """
    run, tag = metrics.run_tag_from_session_and_metric(
        self._request.session_name, self._request.metric_name)
    body, _ = self._scalars_plugin_instance.scalars_impl(
        tag, run, None, scalars_plugin.OutputFormat.JSON)
    return body
