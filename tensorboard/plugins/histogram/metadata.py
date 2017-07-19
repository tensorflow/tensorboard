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
"""Information about histogram summaries."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json

import tensorflow as tf


PLUGIN_NAME = 'histograms'


HistogramMetadata = collections.namedtuple('HistogramMetadata', ())


def create_summary_metadata(display_name, description):
  content = HistogramMetadata()
  metadata = tf.SummaryMetadata(display_name=display_name,
                                summary_description=description)
  metadata.plugin_data.add(plugin_name=PLUGIN_NAME,
                           content=json.dumps(content._asdict()))  # pylint: disable=protected-access
  return metadata


def parse_summary_metadata(content):
  return HistogramMetadata(**json.loads(content))
