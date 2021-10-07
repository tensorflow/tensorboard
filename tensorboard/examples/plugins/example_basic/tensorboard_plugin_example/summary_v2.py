# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Summaries for the example_basic plugin."""


import tensorflow.compat.v2 as tf
from tensorboard.compat.proto import summary_pb2

from tensorboard_plugin_example import metadata


def greeting(name, guest, step=None, description=None):
    """Write a "greeting" summary.

    Arguments:
      name: A name for this summary. The summary tag used for TensorBoard will
        be this name prefixed by any active name scopes.
      guest: A rank-0 string `Tensor`.
      step: Explicit `int64`-castable monotonic step value for this summary. If
        omitted, this defaults to `tf.summary.experimental.get_step()`, which must
        not be None.
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
        name,
        "greeting_summary",
        values=[guest, step],
    ) as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tf.strings.join(["Hello, ", guest, "!"]),
            step=step,
            metadata=_create_summary_metadata(description),
        )


def _create_summary_metadata(description):
    return summary_pb2.SummaryMetadata(
        summary_description=description,
        plugin_data=summary_pb2.SummaryMetadata.PluginData(
            plugin_name=metadata.PLUGIN_NAME,
            content=b"",  # no need for summary-specific metadata
        ),
        data_class=summary_pb2.DATA_CLASS_TENSOR,
    )
