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

from tensorboard.plugins.npmi import plugin_data_pb2
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()

PLUGIN_NAME = "npmi"

# The most recent value for the `version` field of the
# `ScalarPluginData` proto.
PROTO_VERSION = 0

ANNOTATIONS_TAG = "_npmi_/annotations"
METRICS_TAG = "_npmi_/metrics"
VALUES_TAG = "_npmi_/values"
EMBEDDINGS_TAG = "_npmi_/embeddings"


def create_summary_metadata(description):
    content = plugin_data_pb2.NpmiPluginData(version=PROTO_VERSION)
    return summary_pb2.SummaryMetadata(
        summary_description=description,
        plugin_data=summary_pb2.SummaryMetadata.PluginData(
            plugin_name=PLUGIN_NAME, content=content.SerializeToString(),
        ),
        data_class=summary_pb2.DATA_CLASS_TENSOR,
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
    if result.version == 0:
        return result
    else:
        logger.warning(
            "Unknown metadata version: %s. The latest version known to "
            "this build of TensorBoard is %s; perhaps a newer build is "
            "available?",
            result.version,
            PROTO_VERSION,
        )
        return result
