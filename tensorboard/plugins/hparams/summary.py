# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""Utilities for creating summaries for experiments and sessions
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import summary_proto_pb2
from tensorboard.plugins.hparams import constants


def experiment_pb(experiment):
  """
  Arguments:
    exp_metadata: The api_pb2.Experiment instance to wrap in the summary.
  Returns:
    A Summary protobuffer representing the special experiment tag holding the
    given experiment message.
  """
  assert isinstance(experiment, api_pb2.Experiment)
  return _summary_with_serialized_proto(tag=constants.EXPERIMENT_TAG,
                                        protobuffer=experiment)


def session_start_summary_pb(session_start_summary):
  """
  Arguments:
    session: The api_pb2.Session instance to wrap in the summary.
  Returns:
    Returns a Summary protobuffer representing the hparams::SessionStartInfo
    tag holding the given session message
  """
  assert isinstance(session_start_summary,
                    summary_proto_pb2.SessionStartSummary)
  return _summary_with_serialized_proto(tag=constants.SESSION_START_SUMMARY_TAG,
                                        protobuffer=session_start_summary)


def session_end_summary_pb(session_end_summary):
  """
  Arguments:
    session: The api_pb2.Session instance to wrap in the summary.
  Returns:
    Returns a Summary protobuffer representing the hparams::SessionEndInfo
    tag holding the given session message
  """
  assert isinstance(session_end_summary, summary_proto_pb2.SessionEndSummary)
  return _summary_with_serialized_proto(tag=constants.SESSION_END_SUMMARY_TAG,
                                        protobuffer=session_end_summary)


def _summary_with_serialized_proto(tag, protobuffer):
  """Returns a summary proto having the 'tag' and a single Value without
  any data (its 'value' oneof is unset) storing the serialization of
  'protobuffer' in its  metadata.plugin_data.content field."""
  summary_metadata = tf.SummaryMetadata(
      plugin_data=tf.SummaryMetadata.PluginData(
          plugin_name=constants.PLUGIN_NAME,
          content=protobuffer.SerializeToString()))
  summary = tf.Summary()
  summary.value.add(tag=tag, metadata=summary_metadata)
  return summary
