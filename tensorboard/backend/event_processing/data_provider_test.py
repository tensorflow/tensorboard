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


import os

import numpy as np

from tensorboard import context
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
from tensorboard.plugins.image import metadata as image_metadata
from tensorboard.plugins.image import summary_v2 as image_summary
from tensorboard.util import tensor_util
import tensorflow.compat.v1 as tf1
import tensorflow.compat.v2 as tf


tf1.enable_eager_execution()


class MultiplexerDataProviderTest(tf.test.TestCase):
    def setUp(self):
        super().setUp()
        self.logdir = self.get_temp_dir()
        self.ctx = context.RequestContext()

        logdir = os.path.join(self.logdir, "polynomials")
        with tf.summary.create_file_writer(logdir).as_default():
            for i in range(10):
                scalar_summary.scalar(
                    "square", i**2, step=2 * i, description="boxen"
                )
                scalar_summary.scalar("cube", i**3, step=3 * i)

        logdir = os.path.join(self.logdir, "waves")
        with tf.summary.create_file_writer(logdir).as_default():
            for i in range(10):
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
            for description, distribution, name in data:
                tensor = tf.constant([distribution], dtype=tf.float64)
                for i in range(1, 11):
                    histogram_summary.histogram(
                        name, tensor * i, step=i, description=description
                    )

        logdir = os.path.join(self.logdir, "mondrian")
        with tf.summary.create_file_writer(logdir).as_default():
            data = [
                ("red", (221, 28, 38), "top-right"),
                ("blue", (1, 91, 158), "bottom-left"),
                ("yellow", (239, 220, 111), "bottom-right"),
            ]
            for name, color, description in data:
                image_1x1 = tf.constant([[[color]]], dtype=tf.uint8)
                for i in range(1, 11):
                    # Use a non-monotonic sequence of sample sizes to
                    # test `max_length` calculation.
                    k = 6 - abs(6 - i)  # 1, .., 6, .., 2
                    # a `k`-sample image summary of `i`-by-`i` images
                    image = tf.tile(image_1x1, [k, i, i, 1])
                    image_summary.image(
                        name,
                        image,
                        step=i,
                        description=description,
                        max_outputs=99,
                    )

    def create_multiplexer(self):
        multiplexer = event_multiplexer.EventMultiplexer()
        multiplexer.AddRunsFromDirectory(self.logdir)
        multiplexer.Reload()
        return multiplexer

    def create_provider(self):
        multiplexer = self.create_multiplexer()
        return data_provider.MultiplexerDataProvider(multiplexer, self.logdir)

    def test_experiment_metadata(self):
        provider = self.create_provider()
        result = provider.experiment_metadata(self.ctx, experiment_id="unused")
        self.assertEqual(result.data_location, self.logdir)

    def test_list_plugins_with_no_graph(self):
        provider = self.create_provider()
        result = provider.list_plugins(self.ctx, experiment_id="unused")
        self.assertCountEqual(
            result,
            [
                "greetings",
                "marigraphs",
                histogram_metadata.PLUGIN_NAME,
                image_metadata.PLUGIN_NAME,
                scalar_metadata.PLUGIN_NAME,
            ],
        )

    def test_list_plugins_with_graph(self):
        with tf.compat.v1.Graph().as_default() as graph:
            writer = tf.compat.v1.summary.FileWriter(self.logdir)
            writer.add_graph(graph)
            writer.flush()

        provider = self.create_provider()
        result = provider.list_plugins(self.ctx, experiment_id="unused")
        self.assertCountEqual(
            result,
            [
                "greetings",
                "marigraphs",
                graph_metadata.PLUGIN_NAME,
                histogram_metadata.PLUGIN_NAME,
                image_metadata.PLUGIN_NAME,
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

        class FakeMultiplexer:
            def Runs(multiplexer):
                result = ["second_2", "first", "no_time", "second_1"]
                self.assertCountEqual(result, start_times)
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
        result = provider.list_runs(self.ctx, experiment_id="unused")
        self.assertCountEqual(
            result,
            [
                base_provider.Run(
                    run_id=run, run_name=run, start_time=start_time
                )
                for (run, start_time) in start_times.items()
            ],
        )

    def test_list_scalars_all(self):
        provider = self.create_provider()
        result = provider.list_scalars(
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=None,
        )
        self.assertCountEqual(result.keys(), ["polynomials", "waves"])
        self.assertCountEqual(result["polynomials"].keys(), ["square", "cube"])
        self.assertCountEqual(result["waves"].keys(), ["square", "sine"])
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
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(["waves"], ["square"]),
        )
        self.assertCountEqual(result.keys(), ["waves"])
        self.assertCountEqual(result["waves"].keys(), ["square"])

        result = provider.list_scalars(
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(
                tags=["square", "quartic"]
            ),
        )
        self.assertCountEqual(result.keys(), ["polynomials", "waves"])
        self.assertCountEqual(result["polynomials"].keys(), ["square"])
        self.assertCountEqual(result["waves"].keys(), ["square"])

        result = provider.list_scalars(
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(runs=["waves", "hugs"]),
        )
        self.assertCountEqual(result.keys(), ["waves"])
        self.assertCountEqual(result["waves"].keys(), ["sine", "square"])

        result = provider.list_scalars(
            self.ctx,
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
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=run_tag_filter,
            downsample=100,
        )

        self.assertCountEqual(result.keys(), ["polynomials", "waves"])
        self.assertCountEqual(result["polynomials"].keys(), ["square", "cube"])
        self.assertCountEqual(result["waves"].keys(), ["square", "sine"])
        for run in result:
            for tag in result[run]:
                tensor_events = multiplexer.Tensors(run, tag)
                self.assertLen(result[run][tag], len(tensor_events))
                for datum, event in zip(result[run][tag], tensor_events):
                    self.assertEqual(datum.step, event.step)
                    self.assertEqual(datum.wall_time, event.wall_time)
                    self.assertEqual(
                        datum.value,
                        tensor_util.make_ndarray(event.tensor_proto).item(),
                    )

    def test_read_scalars_downsamples(self):
        # TODO(@wchargin): Verify that this always includes the most
        # recent datum, as specified by the interface.
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )
        result = provider.read_scalars(
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            downsample=3,
        )
        self.assertLen(result["waves"]["sine"], 3)

    def test_read_scalars_but_not_rank_0(self):
        provider = self.create_provider()
        run_tag_filter = base_provider.RunTagFilter(["waves"], ["bad"])
        # No explicit checks yet.
        with self.assertRaisesRegex(
            ValueError,
            "can only convert an array of size 1 to a Python scalar",
        ):
            provider.read_scalars(
                self.ctx,
                experiment_id="unused",
                plugin_name="greetings",
                run_tag_filter=run_tag_filter,
                downsample=100,
            )

    def test_read_last_scalars(self):
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )

        run_tag_filter = base_provider.RunTagFilter(
            runs=["waves", "polynomials", "unicorns"],
            tags=["sine", "square", "cube", "iridescence"],
        )
        result = provider.read_last_scalars(
            self.ctx,
            experiment_id="unused",
            plugin_name=scalar_metadata.PLUGIN_NAME,
            run_tag_filter=run_tag_filter,
        )

        self.assertCountEqual(result.keys(), ["polynomials", "waves"])
        self.assertCountEqual(result["polynomials"].keys(), ["square", "cube"])
        self.assertCountEqual(result["waves"].keys(), ["square", "sine"])
        for run in result:
            for tag in result[run]:
                events = multiplexer.Tensors(run, tag)
                if events:
                    last_event = events[-1]
                    datum = result[run][tag]
                    self.assertIsInstance(datum, base_provider.ScalarDatum)
                    self.assertEqual(datum.step, last_event.step)
                    self.assertEqual(datum.wall_time, last_event.wall_time)
                    self.assertEqual(
                        datum.value,
                        tensor_util.make_ndarray(
                            last_event.tensor_proto
                        ).item(),
                    )

    def test_list_tensors_all(self):
        provider = self.create_provider()
        result = provider.list_tensors(
            self.ctx,
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            run_tag_filter=None,
        )
        self.assertCountEqual(result.keys(), ["lebesgue"])
        self.assertCountEqual(result["lebesgue"].keys(), ["uniform", "bimodal"])
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
            self.ctx,
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            run_tag_filter=base_provider.RunTagFilter(
                ["lebesgue"], ["uniform"]
            ),
        )
        self.assertCountEqual(result.keys(), ["lebesgue"])
        self.assertCountEqual(result["lebesgue"].keys(), ["uniform"])

    def test_read_tensors(self):
        multiplexer = self.create_multiplexer()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )

        run_tag_filter = base_provider.RunTagFilter(
            runs=["lebesgue"],
            tags=["uniform", "bimodal"],
        )
        result = provider.read_tensors(
            self.ctx,
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            run_tag_filter=run_tag_filter,
            downsample=100,
        )

        self.assertCountEqual(result.keys(), ["lebesgue"])
        self.assertCountEqual(result["lebesgue"].keys(), ["uniform", "bimodal"])
        for run in result:
            for tag in result[run]:
                tensor_events = multiplexer.Tensors(run, tag)
                self.assertLen(result[run][tag], len(tensor_events))
                for datum, event in zip(result[run][tag], tensor_events):
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
            self.ctx,
            experiment_id="unused",
            plugin_name=histogram_metadata.PLUGIN_NAME,
            downsample=3,
        )
        self.assertLen(result["lebesgue"]["uniform"], 3)

    def test_list_blob_sequences(self):
        provider = self.create_provider()

        with self.subTest("finds all time series for a plugin"):
            result = provider.list_blob_sequences(
                self.ctx,
                experiment_id="unused",
                plugin_name=image_metadata.PLUGIN_NAME,
            )
            self.assertCountEqual(result.keys(), ["mondrian"])
            self.assertCountEqual(
                result["mondrian"].keys(), ["red", "blue", "yellow"]
            )
            sample = result["mondrian"]["blue"]
            self.assertIsInstance(sample, base_provider.BlobSequenceTimeSeries)
            self.assertEqual(sample.max_step, 10)
            # nothing to test for wall time, as it can't be mocked out
            self.assertEqual(sample.plugin_content, b"")
            self.assertEqual(sample.max_length, 6 + 2)
            self.assertEqual(sample.description, "bottom-left")
            self.assertEqual(sample.display_name, "")

        with self.subTest("filters by run/tag"):
            result = provider.list_blob_sequences(
                self.ctx,
                experiment_id="unused",
                plugin_name=image_metadata.PLUGIN_NAME,
                run_tag_filter=base_provider.RunTagFilter(
                    runs=["mondrian", "picasso"], tags=["yellow", "green't"]
                ),
            )
            self.assertCountEqual(result.keys(), ["mondrian"])
            self.assertCountEqual(result["mondrian"].keys(), ["yellow"])
            self.assertIsInstance(
                result["mondrian"]["yellow"],
                base_provider.BlobSequenceTimeSeries,
            )

    def test_read_blob_sequences_and_read_blob(self):
        provider = self.create_provider()

        with self.subTest("reads all time series for a plugin"):
            result = provider.read_blob_sequences(
                self.ctx,
                experiment_id="unused",
                plugin_name=image_metadata.PLUGIN_NAME,
                downsample=4,
            )
            self.assertCountEqual(result.keys(), ["mondrian"])
            self.assertCountEqual(
                result["mondrian"].keys(), ["red", "blue", "yellow"]
            )
            sample = result["mondrian"]["blue"]
            self.assertLen(sample, 4)  # downsampled from 10
            last = sample[-1]
            self.assertIsInstance(last, base_provider.BlobSequenceDatum)
            self.assertEqual(last.step, 10)
            self.assertLen(last.values, 2 + 2)
            blobs = [
                provider.read_blob(self.ctx, blob_key=v.blob_key)
                for v in last.values
            ]
            self.assertEqual(blobs[0], b"10")
            self.assertEqual(blobs[1], b"10")
            self.assertStartsWith(blobs[2], b"\x89PNG")
            self.assertStartsWith(blobs[3], b"\x89PNG")

            blue1 = blobs[2]
            blue2 = blobs[3]
            red1 = provider.read_blob(
                self.ctx,
                blob_key=result["mondrian"]["red"][-1].values[2].blob_key,
            )
            self.assertEqual(blue1, blue2)
            self.assertNotEqual(blue1, red1)

        with self.subTest("filters by run/tag"):
            result = provider.read_blob_sequences(
                self.ctx,
                experiment_id="unused",
                plugin_name=image_metadata.PLUGIN_NAME,
                run_tag_filter=base_provider.RunTagFilter(
                    runs=["mondrian", "picasso"], tags=["yellow", "green't"]
                ),
                downsample=1,
            )
            self.assertCountEqual(result.keys(), ["mondrian"])
            self.assertCountEqual(result["mondrian"].keys(), ["yellow"])
            self.assertIsInstance(
                result["mondrian"]["yellow"][0],
                base_provider.BlobSequenceDatum,
            )


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
