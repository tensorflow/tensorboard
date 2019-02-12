# -*- coding: utf-8 -*-
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
"""Tests for the image plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
from os import path

import tensorflow as tf
# TODO(stephanwlee): Use a test_utils pattern and break this direct dependency on
# TF proto.
from tensorflow.compat.v1 import GraphDef

from tensorboard.compat import tf2
from tensorboard.compat.proto import graph_pb2
from tensorboard.plugins.graph import metadata
from tensorboard.plugins.graph import summary_v2
from tensorboard.util import test_util

try:
  tf2.__version__  # Force lazy import to resolve
except ImportError:
  tf2 = None


class SummaryV2OpTest(tf.test.TestCase):

  def setUp(self):
    super(SummaryV2OpTest, self).setUp()
    if tf2 is None:
      self.skipTest('TF v2 summary API not available')

  def conceptual_graph(self, *args, **kwargs):
    writer = tf2.summary.create_file_writer(self.get_temp_dir())
    with writer.as_default():
      summary_v2.conceptual_graph(*args, **kwargs)
    writer.close()

    summary = self.read_single_event_from_eventfile().summary
    return test_util.ensure_tb_summary_proto(summary)

  def get_conceptual_graph_def_from_summary(self, summary):
    summary_val = summary.value[0]
    tensor = summary_val.tensor.string_val[0]
    self.assertEqual(
        metadata.CONCEPTUAL_GRAPH_SUMMARY_TAG, summary_val.tag)
    return graph_pb2.GraphDef.FromString(tensor)

  def read_single_event_from_eventfile(self):
    event_files = sorted(glob.glob(path.join(self.get_temp_dir(), '*')))
    events = list(tf.compat.v1.train.summary_iterator(event_files[-1]))
    # Expect a boilerplate event for the file_version, then the summary one.
    self.assertEqual(len(events), 2)
    return events[1]

  def test_special_tag_ignores_name_scope(self):
    graph_def = graph_pb2.GraphDef()
    with tf.name_scope('scope'):
      expectd_tag = metadata.CONCEPTUAL_GRAPH_SUMMARY_TAG
      actual_tag = self.conceptual_graph(graph_def).value[0].tag
      self.assertEqual(expectd_tag, actual_tag)

  def test_get_graph_def(self):
    graph_def = graph_pb2.GraphDef()

    summary = self.conceptual_graph(graph_def)
    actual = self.get_conceptual_graph_def_from_summary(summary)
    self.assertProtoEquals(graph_def, actual)


if __name__ == '__main__':
  tf.test.main()
