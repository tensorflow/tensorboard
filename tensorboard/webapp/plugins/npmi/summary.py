# -*- coding: utf-8 -*-
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
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.compat.proto import summary_pb2
from tensorboard.webapp.plugins.npmi import plugin_data_pb2

from tensorboard.compat import tf2 as tf


def npmi_metrics(title, tensor, step=None, description=None):
    """Write the list of calculated metrics for this run.

    Arguments:
      title: The title of this table. Will be added to the metadata. Tables are
        there to support multiple exports from our exporter at the same time and
        be able to distinguish them.
      tensor: A `Tensor` of shape (num_metrics) and dtype string.
      step: Explicit `int64`-castable monotonic step value for this summary. If
        omitted, this defaults to `tf.summary.experimental.get_step()`, which
        must not be None.
      description: Optional long-form description for this summary, as a
        constant `str`. Markdown is supported. Defaults to empty.

    Returns:
      True on success, or false if no summary was written because no default
      summary writer was available.

    Raises:
      ValueError: if a default writer exists, but no step was provided and
        `tf.summary.experimental.get_step()` is None.
    """
    with tf.summary.experimental.summary_scope(
        "metric_classes", title, values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=_create_summary_metadata(description, title),
        )


def npmi_annotations(title, tensor, step=None, description=None):
    """Write the annotations for this run.

    Arguments:
      title: The title of this table. Will be added to the metadata. Tables are
        there to support multiple exports from our exporter at the same time and
        be able to distinguish them.
      tensor: A `Tensor` of shape (num_annotations) and dtype string.
      step: Explicit `int64`-castable monotonic step value for this summary. If
        omitted, this defaults to `tf.summary.experimental.get_step()`, which
        must not be None.
      description: Optional long-form description for this summary, as a
        constant `str`. Markdown is supported. Defaults to empty.

    Returns:
      True on success, or false if no summary was written because no default
      summary writer was available.

    Raises:
      ValueError: if a default writer exists, but no step was provided and
        `tf.summary.experimental.get_step()` is None.
    """
    with tf.summary.experimental.summary_scope(
        "metric_annotations", title, values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=_create_summary_metadata(description, title),
        )


def npmi_values(title, tensor, step=None, description=None):
    """Write the actual npmi values.

    Arguments:
      title: The title of this table. Will be added to the metadata. Tables are
        there to support multiple exports from our exporter at the same time and
        be able to distinguish them.
      tensor: A `Tensor` of shape (num_annotations, num_metrics) and dtype
        float.
      step: Explicit `int64`-castable monotonic step value for this summary. If
        omitted, this defaults to `tf.summary.experimental.get_step()`, which
        must not be None.
      description: Optional long-form description for this summary, as a
        constant `str`. Markdown is supported. Defaults to empty.

    Returns:
      True on success, or false if no summary was written because no default
      summary writer was available.

    Raises:
      ValueError: if a default writer exists, but no step was provided and
        `tf.summary.experimental.get_step()` is None.
    """
    with tf.summary.experimental.summary_scope(
        "metric_results", title, values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=_create_summary_metadata(description, title),
        )


def _create_summary_metadata(description, title):
    content = plugin_data_pb2.NpmiPluginData(title=title)
    return summary_pb2.SummaryMetadata(
        summary_description=description,
        plugin_data=summary_pb2.SummaryMetadata.PluginData(
            plugin_name="npmi", content=content.SerializeToString(),
        ),
    )


def parse_plugin_metadata(content):
    """Parse summary metadata to a Python object.
    Arguments:
      content: The `content` field of a `SummaryMetadata` proto
        corresponding to the scalar plugin.
    Returns:
      A `ScalarPluginData` protobuf object.
    """
    if not isinstance(content, bytes):
        raise TypeError("Content type must be bytes")
    result = plugin_data_pb2.NpmiPluginData.FromString(content)
    return result
