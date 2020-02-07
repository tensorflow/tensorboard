# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Utilities to migrate legacy summaries/events to generic data form.

For legacy summaries, this populates the `SummaryMetadata.data_class`
field and makes any necessary transformations to the tensor value. For
`graph_def` events, this creates a new summary event.

This should be effected after the `data_compat` transformation.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.histogram import metadata as histograms_metadata
from tensorboard.plugins.image import metadata as images_metadata
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.util import tensor_util


def migrate_event(event):
    """Migrate an event to a sequence of events.

    Args:
      event: An `event_pb2.Event`. The caller transfers ownership of the
        event to this method; the event may be mutated, and may or may
        not appear in the returned sequence.

    Returns:
      A sequence of `event_pb2.Event`s to use instead of `event`.
    """
    if event.HasField("graph_def"):
        return _migrate_graph_event(event)
    if event.HasField("summary"):
        return _migrate_summary_event(event)
    return (event,)


def _migrate_graph_event(old_event):
    result = event_pb2.Event()
    result.wall_time = old_event.wall_time
    result.step = old_event.step
    value = result.summary.value.add(tag=graphs_metadata.RUN_GRAPH_NAME)
    graph_bytes = old_event.graph_def
    value.tensor.CopyFrom(tensor_util.make_tensor_proto([graph_bytes]))
    value.metadata.plugin_data.plugin_name = graphs_metadata.PLUGIN_NAME
    # `value.metadata.plugin_data.content` left as the empty proto
    value.metadata.data_class = summary_pb2.DATA_CLASS_BLOB_SEQUENCE
    # In the short term, keep both the old event and the new event to
    # maintain compatibility.
    return (old_event, result)


def _migrate_summary_event(event):
    values = event.summary.value
    new_values = [new for old in values for new in _migrate_value(old)]
    # Optimization: Don't create a new event if there were no shallow
    # changes (there may still have been in-place changes).
    if len(values) == len(new_values) and all(
        x is y for (x, y) in zip(values, new_values)
    ):
        return (event,)
    del event.summary.value[:]
    event.summary.value.extend(new_values)
    return (event,)


def _migrate_value(value):
    """Convert an old value to a stream of new values. May mutate."""
    if value.metadata.data_class != summary_pb2.DATA_CLASS_UNKNOWN:
        return (value,)
    plugin_name = value.metadata.plugin_data.plugin_name
    if plugin_name == histograms_metadata.PLUGIN_NAME:
        return _migrate_histogram_value(value)
    if plugin_name == images_metadata.PLUGIN_NAME:
        return _migrate_image_value(value)
    if plugin_name == scalars_metadata.PLUGIN_NAME:
        return _migrate_scalar_value(value)
    return (value,)


def _migrate_scalar_value(value):
    value.metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
    return (value,)


def _migrate_histogram_value(value):
    value.metadata.data_class = summary_pb2.DATA_CLASS_TENSOR
    return (value,)


def _migrate_image_value(value):
    value.metadata.data_class = summary_pb2.DATA_CLASS_BLOB_SEQUENCE
    return (value,)
