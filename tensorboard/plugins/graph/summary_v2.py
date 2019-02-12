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
"""Graph summaries and TensorFlow operations to create them, V2 versions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.compat import tf2 as tf
from tensorboard.plugins.graph import metadata


def conceptual_graph(graphdef, description=None):
  """Write an conceptual graph summary.

  Arguments:
    graphdef: GraphDef representing a conceptual graph.
    description: Optional long-form description for this summary, as a
      constant `str`. Markdown is supported. Defaults to empty.

  Returns:
    True on success, or false if no summary was emitted because no default
    summary writer was available.
  """
  summary_metadata = metadata.create_summary_metadata(
      display_name=None, description=description)
  with tf.summary.summary_scope('graph_summary'):
    return tf.summary.write(
        tag=metadata.CONCEPTUAL_GRAPH_SUMMARY_TAG,
        tensor=tf.constant(graphdef.SerializeToString(), dtype=tf.string),
        step=0,
        metadata=summary_metadata)
