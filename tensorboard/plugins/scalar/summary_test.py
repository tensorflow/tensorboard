# -*- coding: utf-8 -*-
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
"""Tests for the scalar plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
import os
import sys

import numpy as np
import six
from tensorboard.compat import tf

tf.enable_eager_execution()

from tensorboard.plugins.scalar import metadata
from tensorboard.plugins.scalar import summary

class SummaryBaseTest(object):

  def test_metadata(self):
    pb = self.scalar('a', 1.13)
    summary_metadata = pb.value[0].metadata
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(summary_metadata.summary_description, '')
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    # There's no content, so successfully parsing is fine.
    metadata.parse_plugin_metadata(content)

  def test_explicit__description(self):
    description = 'The first letter of the alphabet.'
    pb = self.scalar('a', 1.13,
                     description=description)
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.summary_description, description)
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    # There's no content, so successfully parsing is fine.
    metadata.parse_plugin_metadata(content)

  def test_float_value(self):
    pb = self.scalar('a', 1.13)
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertEqual(float, type(value))
    self.assertNear(1.13, value, 1e-6)

  def test_int_value(self):
    # ints should be valid, but converted to floats.
    pb = self.scalar('a', 113)
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertEqual(float, type(value))
    self.assertNear(113.0, value, 1e-6)

  def test_bool_value(self):
    # bools should be valid, but converted to floats.
    pb = self.scalar('a', True)
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertEqual(float, type(value))
    self.assertEqual(1.0, value)

  def test_string_value(self):
    # Use str.* in regex because PY3 numpy refers to string arrays using
    # length-dependent type names in the format "str%d" % (32 * len(str)).
    with six.assertRaisesRegex(self, Exception, r'Cast str.*float'):
      self.scalar('a', np.array("113"))

  def test_requires_rank_0(self):
    with six.assertRaisesRegex(self, ValueError, r'Expected scalar shape'):
      self.scalar('a', np.array([1, 1, 3]))


class SummaryV1PbTest(SummaryBaseTest, tf.test.TestCase):
  def scalar(self, *args, **kwargs):
    return summary.pb(*args, **kwargs)


class SummaryV1OpTest(SummaryBaseTest, tf.test.TestCase):
  def scalar(self, *args, **kwargs):
    return tf.Summary.FromString(summary.op(*args, **kwargs).numpy())


class SummaryV2PbTest(SummaryBaseTest, tf.test.TestCase):
  def scalar(self, *args, **kwargs):
    return summary.scalar_pb(*args, **kwargs)


class SummaryV2OpTest(SummaryBaseTest, tf.test.TestCase):
  def scalar(self, *args, **kwargs):
    return self.scalar_event(*args, **kwargs).summary

  def scalar_event(self, *args, **kwargs):
    writer = tf.contrib.summary.create_file_writer(self.get_temp_dir())
    with writer.as_default(), tf.contrib.summary.always_record_summaries():
      summary.scalar(*args, **kwargs)
    return self.read_single_event_from_eventfile()

  def read_single_event_from_eventfile(self):
    event_files = glob.glob(os.path.join(self.get_temp_dir(), '*'))
    self.assertEqual(len(event_files), 1)
    events = list(tf.train.summary_iterator(event_files[0]))
    # Expect a boilerplate event for the file_version, then the summary one.
    self.assertEqual(len(events), 2)
    return events[1]

  def test_step(self):
    event = self.scalar_event('a', 1.0, step=333)
    self.assertEqual(333, event.step)


if __name__ == '__main__':
  tf.test.main()
