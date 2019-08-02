import six

from tensorboard.data import provider
from tensorboard.util import tensor_util

class MultiplexerDataProvider(provider.DataProvider):
  def __init__(self, multiplexer):
    """Trivial initializer.

    Args:
      multiplexer: A `plugin_event_multiplexer.EventMultiplexer` (note:
        not a boring old `event_multiplexer.EventMultiplexer`).
    """
    self._multiplexer = multiplexer

  def list_scalars(
      self,
      experiment_id,
      owner_plugin,
      run_tag_filter=None,
  ):
    del experiment_id  # ignored for now
    run_tag_content = self._multiplexer.PluginRunToTagToContent(owner_plugin)
    result = {}
    for (run, tag_to_content) in six.iteritems(run_tag_content):
      result_for_run = {}
      for tag in tag_to_content:
        if run_tag_filter is not None and not run_tag_filter.test(run, tag):
          continue
        result[run] = result_for_run
        highest_step_event = max(
            self._multiplexer.Tensors(run, tag),
            key=lambda event: event.step,
        )
        result_for_run[tag] = provider.ScalarMetadata(
            max_step=highest_step_event.step,
            corresponding_wall_time=highest_step_event.wall_time,
            summary_metadata=self._multiplexer.SummaryMetadata(run, tag),
        )
    return result

  def read_scalars(
      self,
      experiment_id,
      owner_plugin,
      downsample_to=None,
      run_tag_filter=None,
      step_filter=None,
  ):
    del experiment_id  # ignored for now
    index = self._multiplexer.PluginRunToTagToContent(owner_plugin)
    result = {}
    if step_filter is None:
      step_filter = provider.StepFilter(lower_bound=0, upper_bound=-1)
    for run in run_tag_filter.runs:
      result_for_run = {}
      for tag in run_tag_filter.tags:
        if tag not in index.get(run, {}):
          continue
        result[run] = result_for_run
        all_events = self._multiplexer.Tensors(run, tag)
        max_step = max(all_events, key=lambda event: event.step).step
        (lower_bound, upper_bound) = step_filter.resolve(max_step)
        events = [e for e in all_events if lower_bound <= e.step <= upper_bound]
        del all_events
        result_for_run[tag] = [self._convert_scalar_event(e) for e in events]
        # TODO: Downsampling not used. We could downsample on top of the
        # existing sampling, which would be nice for testing.
    return result

  def _convert_scalar_event(self, event):
    return provider.ScalarDatum(
        step=event.step,
        wall_time=event.wall_time, 
        value=tensor_util.make_ndarray(event.tensor_proto).item(),
    )
