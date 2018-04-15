# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Utilities for creating summaries for experiment and session metadata"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
import numpy as np

from tensorboard.plugins.hparams_explorer import plugin_metadata
from tensorboard.plugins.hparams_explorer import metadata_pb2

def _serialize_proto_to_tensor_proto(protobuffer):
  """Returns a TensorProto containing a serialized protocol buffer.

  Arguments:
    protobuffer: The protocol buffer message to serialize
  Returns:
    A 0-D string tensor in TensorProto format containing the serialization of
    protobuffer.
  """
  return tf.make_tensor_proto(protobuffer.SerializeToString(),
                              dtype=tf.string)


def _summary_with_serialized_proto(tag, protobuffer):
  summary_metadata = plugin_metadata.create_summary_metadata(
      display_name='', description='')
  summary = tf.Summary()
  summary.value.add(tag=tag,
                    metadata=summary_metadata,
                    tensor=_serialize_proto_to_tensor_proto(protobuffer))
  return summary


def experiment_metadata_summary_pb(exp_metadata):
  """Creates an experiment-metadata summary protobuf.

  Arguments:
    exp_metadata: The ExperimentMetadata instance to wrap in the summary.
  Returns:
    A Summary protocol buffer containing the given ExperimentMetadata
    protocol buffer serialized.
  """
  assert isinstance(exp_metadata, metadata_pb2.ExperimentMetadata)
  return _summary_with_serialized_proto(tag='experiment_metadata',
                                        protobuffer = exp_metadata)


def session_metadata_summary_pb(session_metadata):
  """Creates a session-metadata summary protobuf.

  Arguments:
    session_metadata: The SessionMetadata instance to wrap in the summary.
  Returns:
    A Summary protocol buffer containing the given SessionMetadata
    protocol buffer serialized.
  """
  assert isinstance(session_metadata, metadata_pb2.SessionMetadata)
  return _summary_with_serialized_proto(tag='session_metadata',
                                        protobuffer = session_metadata)
