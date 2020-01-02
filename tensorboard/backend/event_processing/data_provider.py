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

import base64
import collections
import json

import six

from tensorboard import errors
from tensorboard.backend.event_processing import plugin_event_accumulator
from tensorboard.data import provider
from tensorboard.plugins.graph import metadata as graphs_metadata
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

    def _validate_experiment_id(self, experiment_id):
        # This data provider doesn't consume the experiment ID at all, but
        # as a courtesy to callers we require that it be a valid string, to
        # help catch usage errors.
        if not isinstance(experiment_id, str):
            raise TypeError(
                "experiment_id must be %r, but got %r: %r"
                % (str, type(experiment_id), experiment_id)
            )

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
        self._validate_experiment_id(experiment_id)
        return str(self._logdir)

    def list_runs(self, experiment_id):
        self._validate_experiment_id(experiment_id)
        return [
            provider.Run(
                run_id=run,  # use names as IDs
                run_name=run,
                start_time=self._get_first_event_timestamp(run),
            )
            for run in self._multiplexer.Runs()
        ]

    def list_scalars(self, experiment_id, plugin_name, run_tag_filter=None):
        self._validate_experiment_id(experiment_id)
        run_tag_content = self._multiplexer.PluginRunToTagToContent(plugin_name)
        return self._list(
            provider.ScalarTimeSeries, run_tag_content, run_tag_filter
        )

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
        return self._read(_convert_scalar_event, index)

    def list_tensors(self, experiment_id, plugin_name, run_tag_filter=None):
        self._validate_experiment_id(experiment_id)
        run_tag_content = self._multiplexer.PluginRunToTagToContent(plugin_name)
        return self._list(
            provider.TensorTimeSeries, run_tag_content, run_tag_filter
        )

    def read_tensors(
        self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
    ):
        # TODO(@wchargin): Downsampling not implemented, as the multiplexer
        # is already downsampled. We could downsample on top of the existing
        # sampling, which would be nice for testing.
        del downsample  # ignored for now
        index = self.list_tensors(
            experiment_id, plugin_name, run_tag_filter=run_tag_filter
        )
        return self._read(_convert_tensor_event, index)

    def _list(self, construct_time_series, run_tag_content, run_tag_filter):
        """Helper to list scalar or tensor time series.

        Args:
          construct_time_series: `ScalarTimeSeries` or `TensorTimeSeries`.
          run_tag_content: Result of `_multiplexer.PluginRunToTagToContent(...)`.
          run_tag_filter: As given by the client; may be `None`.

        Returns:
          A list of objects of type given by `construct_time_series`,
          suitable to be returned from `list_scalars` or `list_tensors`.
        """
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
                result_for_run[tag] = construct_time_series(
                    max_step=max_step,
                    max_wall_time=max_wall_time,
                    plugin_content=summary_metadata.plugin_data.content,
                    description=summary_metadata.summary_description,
                    display_name=summary_metadata.display_name,
                )
        return result

    def _read(self, convert_event, index):
        """Helper to read scalar or tensor data from the multiplexer.

        Args:
          convert_event: Takes `plugin_event_accumulator.TensorEvent` to
            either `provider.ScalarDatum` or `provider.TensorDatum`.
          index: The result of `list_scalars` or `list_tensors`.

        Returns:
          A dict of dicts of values returned by `convert_event` calls,
          suitable to be returned from `read_scalars` or `read_tensors`.
        """
        result = {}
        for (run, tags_for_run) in six.iteritems(index):
            result_for_run = {}
            result[run] = result_for_run
            for (tag, metadata) in six.iteritems(tags_for_run):
                events = self._multiplexer.Tensors(run, tag)
                result_for_run[tag] = [convert_event(e) for e in events]
        return result

    def list_blob_sequences(
        self, experiment_id, plugin_name, run_tag_filter=None
    ):
        self._validate_experiment_id(experiment_id)
        if run_tag_filter is None:
            run_tag_filter = provider.RunTagFilter(runs=None, tags=None)

        # TODO(davidsoergel, wchargin): consider images, etc.
        # Note this plugin_name can really just be 'graphs' for now; the
        # v2 cases are not handled yet.
        if plugin_name != graphs_metadata.PLUGIN_NAME:
            logger.warn("Directory has no blob data for plugin %r", plugin_name)
            return {}

        result = collections.defaultdict(lambda: {})
        for (run, run_info) in six.iteritems(self._multiplexer.Runs()):
            tag = None
            if not self._test_run_tag(run_tag_filter, run, tag):
                continue
            if not run_info[plugin_event_accumulator.GRAPH]:
                continue
            result[run][tag] = provider.BlobSequenceTimeSeries(
                max_step=0,
                max_wall_time=0,
                latest_max_index=0,  # Graphs are always one blob at a time
                plugin_content=None,
                description=None,
                display_name=None,
            )
        return result

    def read_blob_sequences(
        self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
    ):
        self._validate_experiment_id(experiment_id)
        # TODO(davidsoergel, wchargin): consider images, etc.
        # Note this plugin_name can really just be 'graphs' for now; the
        # v2 cases are not handled yet.
        if plugin_name != graphs_metadata.PLUGIN_NAME:
            logger.warn("Directory has no blob data for plugin %r", plugin_name)
            return {}

        result = collections.defaultdict(
            lambda: collections.defaultdict(lambda: [])
        )
        for (run, run_info) in six.iteritems(self._multiplexer.Runs()):
            tag = None
            if not self._test_run_tag(run_tag_filter, run, tag):
                continue
            if not run_info[plugin_event_accumulator.GRAPH]:
                continue

            time_series = result[run][tag]

            wall_time = 0.0  # dummy value for graph
            step = 0  # dummy value for graph
            index = 0  # dummy value for graph

            # In some situations these blobs may have directly accessible URLs.
            # But, for now, we assume they don't.
            graph_url = None
            graph_blob_key = _encode_blob_key(
                experiment_id, plugin_name, run, tag, step, index
            )
            blob_ref = provider.BlobReference(graph_blob_key, graph_url)

            datum = provider.BlobSequenceDatum(
                wall_time=wall_time, step=step, values=(blob_ref,),
            )
            time_series.append(datum)
        return result

    def read_blob(self, blob_key):
        # note: ignoring nearly all key elements: there is only one graph per run.
        (
            unused_experiment_id,
            plugin_name,
            run,
            unused_tag,
            unused_step,
            unused_index,
        ) = _decode_blob_key(blob_key)

        # TODO(davidsoergel, wchargin): consider images, etc.
        if plugin_name != graphs_metadata.PLUGIN_NAME:
            logger.warn("Directory has no blob data for plugin %r", plugin_name)
            raise errors.NotFoundError()

        serialized_graph = self._multiplexer.SerializedGraph(run)

        # TODO(davidsoergel): graph_defs have no step attribute so we don't filter
        # on it.  Other blob types might, though.

        if serialized_graph is None:
            logger.warn("No blob found for key %r", blob_key)
            raise errors.NotFoundError()

        # TODO(davidsoergel): consider internal structure of non-graphdef blobs.
        # In particular, note we ignore the requested index, since it's always 0.
        return serialized_graph


# TODO(davidsoergel): deduplicate with other implementations
def _encode_blob_key(experiment_id, plugin_name, run, tag, step, index):
    """Generate a blob key: a short, URL-safe string identifying a blob.

    A blob can be located using a set of integer and string fields; here we
    serialize these to allow passing the data through a URL.  Specifically, we
    1) construct a tuple of the arguments in order; 2) represent that as an
    ascii-encoded JSON string (without whitespace); and 3) take the URL-safe
    base64 encoding of that, with no padding.  For example:

        1)  Tuple: ("some_id", "graphs", "train", "graph_def", 2, 0)
        2)   JSON: ["some_id","graphs","train","graph_def",2,0]
        3) base64: WyJzb21lX2lkIiwiZ3JhcGhzIiwidHJhaW4iLCJncmFwaF9kZWYiLDIsMF0K

    Args:
      experiment_id: a string ID identifying an experiment.
      plugin_name: string
      run: string
      tag: string
      step: int
      index: int

    Returns:
      A URL-safe base64-encoded string representing the provided arguments.
    """
    # Encodes the blob key as a URL-safe string, as required by the
    # `BlobReference` API in `tensorboard/data/provider.py`, because these keys
    # may be used to construct URLs for retrieving blobs.
    stringified = json.dumps(
        (experiment_id, plugin_name, run, tag, step, index),
        separators=(",", ":"),
    )
    bytesified = stringified.encode("ascii")
    encoded = base64.urlsafe_b64encode(bytesified)
    return six.ensure_str(encoded).rstrip("=")


# Any changes to this function need not be backward-compatible, even though
# the current encoding was used to generate URLs.  The reason is that the
# generated URLs are not considered permalinks: they need to be valid only
# within the context of the session that created them (via the matching
# `_encode_blob_key` function above).
def _decode_blob_key(key):
    """Decode a blob key produced by `_encode_blob_key` into component fields.

    Args:
      key: a blob key, as generated by `_encode_blob_key`.

    Returns:
      A tuple of `(experiment_id, plugin_name, run, tag, step, index)`, with types
      matching the arguments of `_encode_blob_key`.
    """
    decoded = base64.urlsafe_b64decode(key + "==")  # pad past a multiple of 4.
    stringified = decoded.decode("ascii")
    (experiment_id, plugin_name, run, tag, step, index) = json.loads(
        stringified
    )
    return (experiment_id, plugin_name, run, tag, step, index)


def _convert_scalar_event(event):
    """Helper for `read_scalars`."""
    return provider.ScalarDatum(
        step=event.step,
        wall_time=event.wall_time,
        value=tensor_util.make_ndarray(event.tensor_proto).item(),
    )


def _convert_tensor_event(event):
    """Helper for `read_tensors`."""
    return provider.TensorDatum(
        step=event.step,
        wall_time=event.wall_time,
        numpy=tensor_util.make_ndarray(event.tensor_proto),
    )
