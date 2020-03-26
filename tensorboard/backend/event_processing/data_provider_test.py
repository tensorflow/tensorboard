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
import numpy as np

from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.compat.proto import summary_pb2
from tensorboard.data import provider as base_provider
from tensorboard.plugins.graph import metadata as graph_metadata
from tensorboard.plugins.histogram import metadata as histogram_metadata
from tensorboard.plugins.histogram import summary_v2 as histogram_summary
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.plugins.scalar import summary_v2 as scalar_summary
from tensorboard.util import tensor_util
import tensorflow.compat.v1 as tf1
import tensorflow.compat.v2 as tf


tf1.enable_eager_execution()


class MultiplexerDataProviderTest(tf.test.TestCase):
    def setUp(self):
        super(MultiplexerDataProviderTest, self).setUp()
        self.logdir = self.get_temp_dir()

        logdir = os.path.join(self.logdir, "polynomials")
        with tf.summary.create_file_writer(logdir).as_default():
            for i in xrange(10):
                scalar_summary.scalar(
                    "square", i ** 2, step=2 * i, description="boxen"
                )
                scalar_summary.scalar("cube", i ** 3, step=3 * i)

        logdir = os.path.join(self.logdir, "waves")
        with tf.summary.create_file_writer(logdir).as_default():
            for i in xrange(10):
                scalar_summary.scalar("sine", tf.sin(float(i)), step=i)
                scalar_summary.scalar(
                    "square", tf.sign(tf.sin(float(i))), step=i
                )
                # Summary with rank-0 data but not owned by the scalars plugin.
                metadata = summary_pb2.SummaryMetadata()
                metadata.plugin_data.plugin_name = "marigraphs"
                metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
                tf.summary.write(
                    "high_tide", tensor=i, step=i, metadata=metadata
                )
                # Summary with rank-1 data of scalar data class (bad!).
                metadata = summary_pb2.SummaryMetadata()
                metadata.plugin_data.plugin_name = "greetings"
                metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
                tf.summary.write(
                    "bad", tensor=[i, i], step=i, metadata=metadata
                )

        logdir = os.path.join(self.logdir, "lebesgue")
        with tf.summary.create_file_writer(logdir).as_default():
            data = [
                ("very smooth", (0.0, 0.25, 0.5, 0.75, 1.0), "uniform"),
                ("very smoothn't", (0.0, 0.01, 0.99, 1.0), "bimodal"),
            ]
            for (description, distribution, name) in data:
                tensor = tf.constant([distribution], dtype=tf.float64)
                for i in xrange(1, 11):
                    histogram_summary.histogram(
                        name, tensor * i, step=i, description=description
                    )

    def create_multiplexer(self):
        multiplexer = event_multiplexer.EventMultiplexer()
        multiplexer.AddRunsFromDirectory(self.logdir)
        multiplexer.Reload()
        return multiplexer

    def create_provider(self):
        multiplexer = self.create_multiplexer()
        return data_provider.MultiplexerDataProvider(multiplexer, self.logdir)

    def test_data_location(self):
        provider = self.create_provider()
        result = provider.data_location(experiment_id="unused")
        self.assertEqual(result, self.logdir)

    def test_list_plugins_with_no_graph(self):
        provider = self.create_provider()
        result = provider.list_plugins(experiment_id="unused")
        self.assertItemsEqual(
            result,
            [
                "greetings",
                "marigraphs",
                histogram_metadata.PLUGIN_NAME,
                scalar_metadata.PLUGIN_NAME,
            ],
        )

    def test_list_plugins_with_graph(self):
        with tf.compat.v1.Graph().as_default() as graph:
            writer = tf.compat.v1.summary.FileWriter(self.logdir)
            writer.add_graph(graph)
            writer.flush()

        provider = self.create_provider()
        result = provider.list_plugins(experiment_id="unused")
        self.assertItemsEqual(
            result,
            [
                "greetings",
                "marigraphs",
                graph_metadata.PLUGIN_NAME,
                histogram_metadata.PLUGIN_NAME,
                scalar_metadata.PLUGIN_NAME,
            ],
        )

    def test_list_runs(self):
        # We can't control the timestamps of events written to disk (without
        # manually reading the tfrecords, modifying the data, and writing
        # them back out), so we provide a fake multiplexer instead.
        start_times = {
            "second_2": 2.0,
            "first": 1.5,
            "no_time": None,
            "second_1": 2.0,
        }

        class FakeMultiplexer(object):
            def Runs(multiplexer):
                result = ["second_2", "first", "no_time", "second_1"]
                self.assertItemsEqual(result, start_times)
                return result

            def FirstEventTimestamp(multiplexer, run):
                self.assertIn(run, start_times)
                result = start_times[run]
                if result is None:
                    raise ValueError("No event timestep could be found")
                else:
                    return result

        multiplexer = FakeMultiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, "fake_logdir"
        )
        result = provider.list_runs(experiment_id="unused")
        self.assertItemsEqual(
            result,
            [
                base_provider.Run(
                    run_id=run, run_name=run, start_time=start_time
                )
                for (run, start_time) in six.iteritems(start_times)
            ],
        )

    def test_list_scalars_all(self):
        provider = self.create_provider()
        result = provider.list_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=None,
        )
        self.assertItemsEqual(result.keys(), ["polynomials", "waves"])
        self.assertItemsEqual(result["polynomials"].keys(), ["square", "cube"])
        self.assertItemsEqual(result["waves"].keys(), ["square", "sine"])
        sample = result["polynomials"]["square"]
        self.assertIsInstance(sample, base_provider.ScalarTimeSeries)
        self.assertEqual(sample.max_step, 18)
        # nothing to test for wall time, as it can't be mocked out
        self.assertEqual(sample.plugin_content, b"")
        self.assertEqual(
            sample.display_name, ""
        )  # not written by V2 summary ops
        self.assertEqual(sample.description, "boxen")

    def test_list_scalars_filters(self):
        provider = self.create_provider()

        result = provider.list_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(["waves"], ["square"]),
        )
        self.assertItemsEqual(result.keys(), ["waves"])
        self.assertItemsEqual(result["waves"].keys(), ["square"])

        result = provider.list_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(
                tags=["square", "quartic"]
            ),
        )
        self.assertItemsEqual(result.keys(), ["polynomials", "waves"])
        self.assertItemsEqual(result["polynomials"].keys(), ["square"])
        self.assertItemsEqual(result["waves"].keys(), ["square"])

        result = provider.list_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(runs=["waves", "hugs"]),
        )
        self.assertItemsEqual(result.keys(), ["waves"])
        self.assertItemsEqual(result["waves"].keys(), ["sine", "square"])

        result = provider.list_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(["un"], ["likely"]),
        )
        self.assertEqual(result, {})

    def test_read_scalars(self):
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )

        run_tag_filter = base_provider.RunTagFilter(
            runs=["waves", "polynomials", "unicorns"],
            tags=["sine", "square", "cube", "iridescence"],
        )
        result = provider.read_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=run_tag_filter,
            downsample=100,
        )

        self.assertItemsEqual(result.keys(), ["polynomials", "waves"])
        self.assertItemsEqual(result["polynomials"].keys(), ["square", "cube"])
        self.assertItemsEqual(result["waves"].keys(), ["square", "sine"])
        for run in result:
            for tag in result[run]:
                tensor_events = multiplexer.Tensors(run, tag)
                self.assertLen(result[run][tag], len(tensor_events))
                for (datum, event) in zip(result[run][tag], tensor_events):
                    self.assertEqual(datum.step, event.step)
                    self.assertEqual(datum.wall_time, event.wall_time)
                    self.assertEqual(
                        datum.value,
                        tensor_util.make_ndarray(event.tensor_proto).item(),
                    )

    def test_read_scalars_downsamples(self):
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )
        result = provider.read_scalars(
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            downsample=3,
        )
        self.assertLen(result["waves"]["sine"], 3)

    def test_read_scalars_but_not_rank_0(self):
        provider = self.create_provider()
        run_tag_filter = base_provider.RunTagFilter(["waves"], ["bad"])
        # No explicit checks yet.
        with six.assertRaisesRegex(
            self,
            ValueError,
            "can only convert an array of size 1 to a Python scalar",
        ):
            provider.read_scalars(
                experiment_id="unused",
                plugin_name="greetings",
                run_tag_filter=run_tag_filter,
                downsample=100,
            )

    def test_list_tensors_all(self):
        provider = self.create_provider()
        result = provider.list_tensors(
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            run_tag_filter=None,
        )
        self.assertItemsEqual(result.keys(), ["lebesgue"])
        self.assertItemsEqual(result["lebesgue"].keys(), ["uniform", "bimodal"])
        sample = result["lebesgue"]["uniform"]
        self.assertIsInstance(sample, base_provider.TensorTimeSeries)
        self.assertEqual(sample.max_step, 10)
        # nothing to test for wall time, as it can't be mocked out
        self.assertEqual(sample.plugin_content, b"")
        self.assertEqual(
            sample.display_name, ""
        )  # not written by V2 summary ops
        self.assertEqual(sample.description, "very smooth")

    def test_list_tensors_filters(self):
        provider = self.create_provider()

        # Quick check only, as scalars and tensors use the same underlying
        # filtering implementation.
        result = provider.list_tensors(
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(
                ["lebesgue"], ["uniform"]
            ),
        )
        self.assertItemsEqual(result.keys(), ["lebesgue"])
        self.assertItemsEqual(result["lebesgue"].keys(), ["uniform"])

    def test_read_tensors(self):
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )

        run_tag_filter = base_provider.RunTagFilter(
            runs=["lebesgue"], tags=["uniform", "bimodal"],
        )
        result = provider.read_tensors(
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            run_tag_filter=run_tag_filter,
            downsample=100,
        )

        self.assertItemsEqual(result.keys(), ["lebesgue"])
        self.assertItemsEqual(result["lebesgue"].keys(), ["uniform", "bimodal"])
        for run in result:
            for tag in result[run]:
                tensor_events = multiplexer.Tensors(run, tag)
                self.assertLen(result[run][tag], len(tensor_events))
                for (datum, event) in zip(result[run][tag], tensor_events):
                    self.assertEqual(datum.step, event.step)
                    self.assertEqual(datum.wall_time, event.wall_time)
                    np.testing.assert_equal(
                        datum.numpy,
                        tensor_util.make_ndarray(event.tensor_proto),
                    )

    def test_read_tensors_downsamples(self):
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )
        result = provider.read_tensors(
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            downsample=3,
        )
        self.assertLen(result["lebesgue"]["uniform"], 3)


class DownsampleTest(tf.test.TestCase):
    """Tests for the `_downsample` private helper function."""

    def test_deterministic(self):
        xs = "abcdefg"
        expected = data_provider._downsample(xs, k=4)
        for _ in range(100):
            actual = data_provider._downsample(xs, k=4)
            self.assertEqual(actual, expected)

    def test_underlong_ok(self):
        xs = list("abcdefg")
        actual = data_provider._downsample(xs, k=10)
        expected = list("abcdefg")
        self.assertIsNot(actual, xs)
        self.assertEqual(actual, expected)

    def test_inorder(self):
        xs = list(range(10000))
        actual = data_provider._downsample(xs, k=100)
        self.assertEqual(actual, sorted(actual))

    def test_zero(self):
        xs = "abcdefg"
        actual = data_provider._downsample(xs, k=0)
        self.assertEqual(actual, [])


if __name__ == "__main__":
    tf.test.main()
