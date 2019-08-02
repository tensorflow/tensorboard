# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Unit tests for `tensorboard.backend.event_processing.data_provider`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import six
from six.moves import xrange  # pylint: disable=redefined-builtin

from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
  plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.compat.proto import summary_pb2
from tensorboard.data import provider as base_provider
from tensorboard.plugins.image import metadata as image_metadata
from tensorboard.plugins.image import summary_v2 as image_summary
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.plugins.scalar import summary_v2 as scalar_summary
import tensorflow.compat.v2 as tf


class MultiplexerDataProviderTest(tf.test.TestCase):
  def setUp(self):
    super(MultiplexerDataProviderTest, self).setUp()
    self.logdir = self.get_temp_dir()

    logdir = os.path.join(self.logdir, "polynomials")
    with tf.summary.create_file_writer(logdir).as_default():
      for i in xrange(10):
        scalar_summary.scalar("square", i ** 2, step=2 * i)
        scalar_summary.scalar("cube", i ** 3, step=3 * i)

    logdir = os.path.join(self.logdir, "waves")
    with tf.summary.create_file_writer(logdir).as_default():
      for i in xrange(10):
        scalar_summary.scalar("sine", tf.sin(float(i)), step=i)
        scalar_summary.scalar("square", tf.sign(tf.sin(float(i))), step=i)
        # Summary with rank-0 data but not owned by the scalars plugin.
        metadata = summary_pb2.SummaryMetadata()
        metadata.plugin_data.plugin_name = "marigraphs"
        tf.summary.write("high_tide", tensor=i, step=i, metadata=metadata)

    logdir = os.path.join(self.logdir, "pictures")
    with tf.summary.create_file_writer(logdir).as_default():
      purple = tf.constant([[[255, 0, 255]]], dtype=tf.uint8)
      for i in xrange(1, 11):
        image_summary.image("purple", [tf.tile(purple, [i, i, 1])], step=i)

  def create_provider(self):
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(self.logdir)
    multiplexer.Reload()
    return data_provider.MultiplexerDataProvider(multiplexer)

  def test_list_scalars_all(self):
    provider = self.create_provider()
    result = provider.list_scalars(
        experiment_id="unused",
        owner_plugin=scalar_metadata.PLUGIN_NAME,
        run_tag_filter=None,
    )
    self.assertItemsEqual(result.keys(), ["polynomials", "waves"])
    self.assertItemsEqual(result["polynomials"].keys(), ["square", "cube"])
    self.assertItemsEqual(result["waves"].keys(), ["square", "sine"])
    sample = result["polynomials"]["square"]
    self.assertIsInstance(sample, base_provider.ScalarMetadata)
    self.assertEqual(sample.max_step, 18)
    # nothing to test for wall time, as it can't be mocked out
    self.assertIsInstance(sample.summary_metadata, summary_pb2.SummaryMetadata)
    self.assertEqual(
        sample.summary_metadata.plugin_data.plugin_name,
        scalar_metadata.PLUGIN_NAME,
    )

  def test_list_scalars_filters(self):
    provider = self.create_provider()

    result = provider.list_scalars(
        experiment_id="unused",
        owner_plugin=scalar_metadata.PLUGIN_NAME,
        run_tag_filter=base_provider.RunTagFilter(tags=["square", "quartic"]),
    )
    self.assertItemsEqual(result.keys(), ["polynomials", "waves"])
    self.assertItemsEqual(result["polynomials"].keys(), ["square"])
    self.assertItemsEqual(result["waves"].keys(), ["square"])

    result = provider.list_scalars(
        experiment_id="unused",
        owner_plugin=scalar_metadata.PLUGIN_NAME,
        run_tag_filter=base_provider.RunTagFilter(runs=["waves", "hugs"]),
    )
    self.assertItemsEqual(result.keys(), ["waves"])
    self.assertItemsEqual(result["waves"].keys(), ["sine", "square"])

    result = provider.list_scalars(
        experiment_id="unused",
        owner_plugin=scalar_metadata.PLUGIN_NAME,
        run_tag_filter=base_provider.RunTagFilter(["un"], ["likely"]),
    )
    self.assertEqual(result, {})

  def test_read_scalars(self):
    provider = self.create_provider()

    run_tag_filter = base_provider.RunTagFilter(
        runs=["waves", "polynomials"], tags=["sine", "square", "cube"]
    )
    step_filter = base_provider.StepFilter(lower_bound=2, upper_bound=-3)
    # steps [0, 2, ..., 18] from 2 to -3 = [2, ..., 16]
    result = provider.read_scalars(
        experiment_id="unused",
        owner_plugin=scalar_metadata.PLUGIN_NAME,
        run_tag_filter=run_tag_filter,
        step_filter=step_filter,
        downsample_to=None,  # not yet implemented
    )

    self.assertItemsEqual(result.keys(), ["polynomials", "waves"])
    self.assertItemsEqual(result["polynomials"].keys(), ["square", "cube"])
    self.assertItemsEqual(result["waves"].keys(), ["square", "sine"])
    sample_series = result["polynomials"]["square"]
    self.assertLen(sample_series, 8)
    sample = sample_series[6]
    self.assertIsInstance(sample, base_provider.ScalarDatum)
    self.assertEqual(sample.step, 14)
    # nothing to test for wall time, as it can't be mocked out
    self.assertEqual(sample.value, 49.0)

  def test_read_scalars_but_not_rank_0(self):
    provider = self.create_provider()
    run_tag_filter = base_provider.RunTagFilter(["pictures"], ["purple"])
    # No explicit checks yet.
    with six.assertRaisesRegex(
        self,
        ValueError,
        "can only convert an array of size 1 to a Python scalar"):
      provider.read_scalars(
        experiment_id="unused",
        owner_plugin=image_metadata.PLUGIN_NAME,
        run_tag_filter=run_tag_filter,
      )


if __name__ == "__main__":
  tf.test.main()
