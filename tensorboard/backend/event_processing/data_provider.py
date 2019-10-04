# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Bridge from event multiplexer storage to generic data APIs."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six

from tensorboard.data import provider
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util


logger = tb_logging.get_logger()


class MultiplexerDataProvider(provider.DataProvider):
  def __init__(self, multiplexer, logdir):
    """Trivial initializer.

    Args:
      multiplexer: A `plugin_event_multiplexer.EventMultiplexer` (note:
        not a boring old `event_multiplexer.EventMultiplexer`).
      logdir: The log directory from which data is being read. Only used
        cosmetically. Should be a `str`.
    """
    self._multiplexer = multiplexer
    self._logdir = logdir

  def _test_run_tag(self, run_tag_filter, run, tag):
    runs = run_tag_filter.runs
    if runs is not None and run not in runs:
      return False
    tags = run_tag_filter.tags
    if tags is not None and tag not in tags:
      return False
    return True

  def _get_first_event_timestamp(self, run_name):
    try:
      return self._multiplexer.FirstEventTimestamp(run_name)
    except ValueError as e:
      return None

  def data_location(self, experiment_id):
    del experiment_id   # ignored
    return str(self._logdir)

  def list_runs(self, experiment_id):
    del experiment_id  # ignored for now
    return [
        provider.Run(
            run_id=run,  # use names as IDs
            run_name=run,
            start_time=self._get_first_event_timestamp(run),
        )
        for run in self._multiplexer.Runs()
    ]

  def list_scalars(self, experiment_id, plugin_name, run_tag_filter=None):
    del experiment_id  # ignored for now
    run_tag_content = self._multiplexer.PluginRunToTagToContent(plugin_name)
    result = {}
    if run_tag_filter is None:
      run_tag_filter = provider.RunTagFilter(runs=None, tags=None)
    for (run, tag_to_content) in six.iteritems(run_tag_content):
      result_for_run = {}
      for tag in tag_to_content:
        if not self._test_run_tag(run_tag_filter, run, tag):
          continue
        result[run] = result_for_run
        max_step = None
        max_wall_time = None
        for event in self._multiplexer.Tensors(run, tag):
          if max_step is None or max_step < event.step:
            max_step = event.step
          if max_wall_time is None or max_wall_time < event.wall_time:
            max_wall_time = event.wall_time
        summary_metadata = self._multiplexer.SummaryMetadata(run, tag)
        result_for_run[tag] = provider.ScalarTimeSeries(
            max_step=max_step,
            max_wall_time=max_wall_time,
            plugin_content=summary_metadata.plugin_data.content,
            description=summary_metadata.summary_description,
            display_name=summary_metadata.display_name,
        )
    return result

  def read_scalars(
      self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
  ):
    # TODO(@wchargin): Downsampling not implemented, as the multiplexer
    # is already downsampled. We could downsample on top of the existing
    # sampling, which would be nice for testing.
    del downsample  # ignored for now
    index = self.list_scalars(
        experiment_id, plugin_name, run_tag_filter=run_tag_filter
    )
    result = {}
    for (run, tags_for_run) in six.iteritems(index):
      result_for_run = {}
      result[run] = result_for_run
      for (tag, metadata) in six.iteritems(tags_for_run):
        events = self._multiplexer.Tensors(run, tag)
        result_for_run[tag] = [self._convert_scalar_event(e) for e in events]
    return result

  def _convert_scalar_event(self, event):
    return provider.ScalarDatum(
        step=event.step,
        wall_time=event.wall_time,
        value=tensor_util.make_ndarray(event.tensor_proto).item(),
    )
