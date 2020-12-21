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

from tensorboard.compat import tf2 as tf

from tensorboard.plugins.npmi import metadata


def npmi_metrics(tensor, step=None, description=None):
    """Write the list of calculated metrics for this run.

    Arguments:
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
        metadata.METRICS_TAG,
        "",
        values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=metadata.create_summary_metadata(description),
        )


def npmi_annotations(tensor, step=None, description=None):
    """Write the annotations for this run.

    Arguments:
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
        metadata.ANNOTATIONS_TAG,
        "",
        values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=metadata.create_summary_metadata(description),
        )


def npmi_values(tensor, step=None, description=None):
    """Write the actual npmi values.

    Arguments:
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
        metadata.VALUES_TAG,
        "",
        values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=metadata.create_summary_metadata(description),
        )


def npmi_embeddings(tensor, step=None, description=None):
    """Write the embedding representations for the annotations in the dataset.

    Arguments:
      tensor: A `Tensor` of shape (num_annotations, embedding_dimension) and dtype
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
        metadata.EMBEDDINGS_TAG,
        "",
        values=[tensor, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tensor,
            step=step,
            metadata=metadata.create_summary_metadata(description),
        )
