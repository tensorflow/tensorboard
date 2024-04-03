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
"""Integration tests for the Metrics Plugin."""


import argparse
import collections.abc
import os.path

import tensorflow.compat.v1 as tf1
import tensorflow.compat.v2 as tf

from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.image import metadata as image_metadata
from tensorboard.plugins.metrics import metrics_plugin

tf1.enable_eager_execution()


class MetricsPluginTest(tf.test.TestCase):
    def setUp(self):
        super().setUp()
        self._logdir = self.get_temp_dir()
        self._multiplexer = event_multiplexer.EventMultiplexer()

        flags = argparse.Namespace(generic_data="true")
        provider = data_provider.MultiplexerDataProvider(
            self._multiplexer, self._logdir
        )
        ctx = base_plugin.TBContext(
            flags=flags,
            logdir=self._logdir,
            multiplexer=self._multiplexer,
            data_provider=provider,
        )
        self._plugin = metrics_plugin.MetricsPlugin(ctx)

    ### Writing utilities.

    def _write_scalar(self, run, tag, description=None):
        subdir = os.path.join(self._logdir, run)
        writer = tf.summary.create_file_writer(subdir)

        with writer.as_default():
            tf.summary.scalar(tag, 42, step=0, description=description)
            writer.flush()
        self._multiplexer.AddRunsFromDirectory(self._logdir)

    def _write_scalar_data(self, run, tag, data=[]):
        """Writes scalar data, starting at step 0.

        Args:
          run: string run name.
          tag: string tag name.
          data: list of scalar values to write at each step.
        """
        subdir = os.path.join(self._logdir, run)
        writer = tf.summary.create_file_writer(subdir)

        with writer.as_default():
            step = 0
            for datum in data:
                tf.summary.scalar(tag, datum, step=step)
                step += 1
            writer.flush()
        self._multiplexer.AddRunsFromDirectory(self._logdir)

    def _write_histogram(self, run, tag, description=None):
        subdir = os.path.join(self._logdir, run)
        writer = tf.summary.create_file_writer(subdir)

        with writer.as_default():
            data = tf.random.normal(shape=[3])
            tf.summary.histogram(tag, data, step=0, description=description)
            writer.flush()
        self._multiplexer.AddRunsFromDirectory(self._logdir)

    def _write_histogram_data(self, run, tag, data=[]):
        """Writes histogram data, starting at step 0.

        Args:
          run: string run name.
          tag: string tag name.
          data: list of histogram values to write at each step.
        """
        subdir = os.path.join(self._logdir, run)
        writer = tf.summary.create_file_writer(subdir)

        with writer.as_default():
            step = 0
            for datum in data:
                tf.summary.histogram(tag, datum, step=step)
                step += 1
            writer.flush()
        self._multiplexer.AddRunsFromDirectory(self._logdir)

    def _write_image(self, run, tag, samples=2, description=None):
        subdir = os.path.join(self._logdir, run)
        writer = tf.summary.create_file_writer(subdir)

        with writer.as_default():
            data = tf.random.normal(shape=[samples, 8, 8, 1])
            tf.summary.image(
                tag, data, step=0, max_outputs=samples, description=description
            )
            writer.flush()
        self._multiplexer.AddRunsFromDirectory(self._logdir)

    ### Misc utilities.

    def _clean_time_series_responses(self, responses):
        """Cleans non-deterministic data from a TimeSeriesResponse, in
        place."""
        for response in responses:
            run_to_series = response.get("runToSeries", {})
            for run, series in run_to_series.items():
                for datum in series:
                    if "wallTime" in datum:
                        datum["wallTime"] = "<wall_time>"

            # Clean images.
            run_to_image_series = response.get("runToSeries", {})
            for run, series in run_to_image_series.items():
                for datum in series:
                    if "wallTime" in datum:
                        datum["wallTime"] = "<wall_time>"
                    if "imageId" in datum:
                        datum["imageId"] = "<image_id>"

        return responses

    def _get_image_blob_key(self, run, tag, step=0, sample=0):
        """Returns a single image's blob_key after it has been written."""
        mapping = self._plugin._data_provider.read_blob_sequences(
            context.RequestContext(),
            experiment_id="expid",
            plugin_name=image_metadata.PLUGIN_NAME,
            downsample=10,
            run_tag_filter=provider.RunTagFilter(tags=[tag]),
        )
        blob_sequence_datum = mapping[run][tag][step]
        # For images, the first 2 datum values are ignored.
        return blob_sequence_datum.values[2 + sample].blob_key

    ### Actual tests.

    def test_routes_provided(self):
        """Tests that the plugin offers the correct routes."""
        routes = self._plugin.get_plugin_apps()
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)

    def test_tags_empty(self):
        response = self._plugin._tags_impl(context.RequestContext(), "eid")

        expected_tags = {
            "runTagInfo": {},
            "tagDescriptions": {},
        }
        self.assertEqual(expected_tags, response["scalars"])
        self.assertEqual(expected_tags, response["histograms"])
        self.assertEqual(
            {
                "tagDescriptions": {},
                "tagRunSampledInfo": {},
            },
            response["images"],
        )

    def test_tags(self):
        self._write_scalar("run1", "scalars/tagA", None)
        self._write_scalar("run1", "scalars/tagA", None)
        self._write_scalar("run1", "scalars/tagB", None)
        self._write_scalar("run2", "scalars/tagB", None)
        self._write_histogram("run1", "histograms/tagA", None)
        self._write_histogram("run1", "histograms/tagA", None)
        self._write_histogram("run1", "histograms/tagB", None)
        self._write_histogram("run2", "histograms/tagB", None)
        self._write_image("run1", "images/tagA", 1, None)
        self._write_image("run1", "images/tagA", 2, None)
        self._write_image("run1", "images/tagB", 3, None)
        self._write_image("run2", "images/tagB", 4, None)

        self._multiplexer.Reload()

        response = self._plugin._tags_impl(context.RequestContext(), "eid")

        self.assertEqual(
            {
                "runTagInfo": {
                    "run1": ["scalars/tagA", "scalars/tagB"],
                    "run2": ["scalars/tagB"],
                },
                "tagDescriptions": {},
            },
            response["scalars"],
        )
        self.assertEqual(
            {
                "runTagInfo": {
                    "run1": ["histograms/tagA", "histograms/tagB"],
                    "run2": ["histograms/tagB"],
                },
                "tagDescriptions": {},
            },
            response["histograms"],
        )
        self.assertEqual(
            {
                "tagDescriptions": {},
                "tagRunSampledInfo": {
                    "images/tagA": {"run1": {"maxSamplesPerStep": 2}},
                    "images/tagB": {
                        "run1": {"maxSamplesPerStep": 3},
                        "run2": {"maxSamplesPerStep": 4},
                    },
                },
            },
            response["images"],
        )

    def test_tags_with_descriptions(self):
        self._write_scalar("run1", "scalars/tagA", "Describing tagA")
        self._write_scalar("run1", "scalars/tagB", "Describing tagB")
        self._write_scalar("run2", "scalars/tagB", "Describing tagB")
        self._write_histogram("run1", "histograms/tagA", "Describing tagA")
        self._write_histogram("run1", "histograms/tagB", "Describing tagB")
        self._write_histogram("run2", "histograms/tagB", "Describing tagB")
        self._write_image("run1", "images/tagA", 1, "Describing tagA")
        self._write_image("run1", "images/tagB", 2, "Describing tagB")
        self._write_image("run2", "images/tagB", 3, "Describing tagB")
        self._multiplexer.Reload()

        response = self._plugin._tags_impl(context.RequestContext(), "eid")

        self.assertEqual(
            {
                "runTagInfo": {
                    "run1": ["scalars/tagA", "scalars/tagB"],
                    "run2": ["scalars/tagB"],
                },
                "tagDescriptions": {
                    "scalars/tagA": "<p>Describing tagA</p>",
                    "scalars/tagB": "<p>Describing tagB</p>",
                },
            },
            response["scalars"],
        )
        self.assertEqual(
            {
                "runTagInfo": {
                    "run1": ["histograms/tagA", "histograms/tagB"],
                    "run2": ["histograms/tagB"],
                },
                "tagDescriptions": {
                    "histograms/tagA": "<p>Describing tagA</p>",
                    "histograms/tagB": "<p>Describing tagB</p>",
                },
            },
            response["histograms"],
        )
        self.assertEqual(
            {
                "tagDescriptions": {
                    "images/tagA": "<p>Describing tagA</p>",
                    "images/tagB": "<p>Describing tagB</p>",
                },
                "tagRunSampledInfo": {
                    "images/tagA": {"run1": {"maxSamplesPerStep": 1}},
                    "images/tagB": {
                        "run1": {"maxSamplesPerStep": 2},
                        "run2": {"maxSamplesPerStep": 3},
                    },
                },
            },
            response["images"],
        )

    def test_tags_conflicting_description(self):
        self._write_scalar("run1", "scalars/tagA", None)
        self._write_scalar("run2", "scalars/tagA", "tagA is hot")
        self._write_scalar("run3", "scalars/tagA", "tagA is cold")
        self._write_scalar("run4", "scalars/tagA", "tagA is cold")
        self._write_histogram("run1", "histograms/tagA", None)
        self._write_histogram("run2", "histograms/tagA", "tagA is hot")
        self._write_histogram("run3", "histograms/tagA", "tagA is cold")
        self._write_histogram("run4", "histograms/tagA", "tagA is cold")
        self._multiplexer.Reload()

        response = self._plugin._tags_impl(context.RequestContext(), "eid")

        expected_composite_description = (
            "<h1>Multiple descriptions</h1>\n"
            "<h2>For runs: run3, run4</h2>\n"
            "<p>tagA is cold</p>\n"
            "<h2>For run: run2</h2>\n"
            "<p>tagA is hot</p>"
        )
        self.assertEqual(
            {"scalars/tagA": expected_composite_description},
            response["scalars"]["tagDescriptions"],
        )
        self.assertEqual(
            {"histograms/tagA": expected_composite_description},
            response["histograms"]["tagDescriptions"],
        )

    def test_tags_unsafe_description(self):
        self._write_scalar("<&#run>", "scalars/<&#tag>", "<&#description>")
        self._write_histogram(
            "<&#run>", "histograms/<&#tag>", "<&#description>"
        )
        self._multiplexer.Reload()

        response = self._plugin._tags_impl(context.RequestContext(), "eid")

        self.assertEqual(
            {"scalars/<&#tag>": "<p>&lt;&amp;#description&gt;</p>"},
            response["scalars"]["tagDescriptions"],
        )
        self.assertEqual(
            {"histograms/<&#tag>": "<p>&lt;&amp;#description&gt;</p>"},
            response["histograms"]["tagDescriptions"],
        )

    def test_tags_unsafe_conflicting_description(self):
        self._write_scalar("<&#run1>", "scalars/<&#tag>", None)
        self._write_scalar("<&#run2>", "scalars/<&#tag>", "<&# is hot>")
        self._write_scalar("<&#run3>", "scalars/<&#tag>", "<&# is cold>")
        self._write_scalar("<&#run4>", "scalars/<&#tag>", "<&# is cold>")
        self._write_histogram("<&#run1>", "histograms/<&#tag>", None)
        self._write_histogram("<&#run2>", "histograms/<&#tag>", "<&# is hot>")
        self._write_histogram("<&#run3>", "histograms/<&#tag>", "<&# is cold>")
        self._write_histogram("<&#run4>", "histograms/<&#tag>", "<&# is cold>")
        self._multiplexer.Reload()

        response = self._plugin._tags_impl(context.RequestContext(), "eid")

        expected_composite_description = (
            "<h1>Multiple descriptions</h1>\n"
            "<h2>For runs: &lt;&amp;#run3&gt;, &lt;&amp;#run4&gt;</h2>\n"
            "<p>&lt;&amp;# is cold&gt;</p>\n"
            "<h2>For run: &lt;&amp;#run2&gt;</h2>\n"
            "<p>&lt;&amp;# is hot&gt;</p>"
        )
        self.assertEqual(
            {"scalars/<&#tag>": expected_composite_description},
            response["scalars"]["tagDescriptions"],
        )
        self.assertEqual(
            {"histograms/<&#tag>": expected_composite_description},
            response["histograms"]["tagDescriptions"],
        )

    def test_time_series_scalar(self):
        self._write_scalar_data("run1", "scalars/tagA", [0, 100, -200])
        self._multiplexer.Reload()

        requests = [{"plugin": "scalars", "tag": "scalars/tagA"}]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "", requests
        )
        clean_response = self._clean_time_series_responses(response)

        self.assertEqual(
            [
                {
                    "plugin": "scalars",
                    "tag": "scalars/tagA",
                    "runToSeries": {
                        "run1": [
                            {
                                "wallTime": "<wall_time>",
                                "step": 0,
                                "value": 0.0,
                            },
                            {
                                "wallTime": "<wall_time>",
                                "step": 1,
                                "value": 100.0,
                            },
                            {
                                "wallTime": "<wall_time>",
                                "step": 2,
                                "value": -200.0,
                            },
                        ]
                    },
                }
            ],
            clean_response,
        )

    def test_time_series_histogram(self):
        self._write_histogram_data("run1", "histograms/tagA", [0, 10])
        self._multiplexer.Reload()

        requests = [
            {"plugin": "histograms", "tag": "histograms/tagA", "run": "run1"}
        ]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "", requests
        )
        clean_response = self._clean_time_series_responses(response)

        # By default 30 bins will be generated.
        bins_zero = [{"min": 0, "max": 0, "count": 0}] * 29 + [
            {"min": 0, "max": 0, "count": 1.0}
        ]
        bins_ten = [{"min": 10, "max": 10, "count": 0}] * 29 + [
            {"min": 10, "max": 10, "count": 1.0}
        ]

        self.assertEqual(
            [
                {
                    "plugin": "histograms",
                    "tag": "histograms/tagA",
                    "run": "run1",
                    "runToSeries": {
                        "run1": [
                            {
                                "wallTime": "<wall_time>",
                                "step": 0,
                                "bins": bins_zero,
                            },
                            {
                                "wallTime": "<wall_time>",
                                "step": 1,
                                "bins": bins_ten,
                            },
                        ]
                    },
                }
            ],
            clean_response,
        )

    def test_time_series_unmatching_request(self):
        self._write_scalar_data("run1", "scalars/tagA", [0, 100, -200])

        self._multiplexer.Reload()

        requests = [{"plugin": "scalars", "tag": "nothing-matches"}]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "", requests
        )
        clean_response = self._clean_time_series_responses(response)

        self.assertEqual(
            [
                {
                    "plugin": "scalars",
                    "runToSeries": {},
                    "tag": "nothing-matches",
                }
            ],
            clean_response,
        )

    def test_time_series_multiple_runs(self):
        self._write_scalar_data("run1", "scalars/tagA", [0])
        self._write_scalar_data("run2", "scalars/tagA", [1])
        self._write_scalar_data("run2", "scalars/tagB", [2])

        self._multiplexer.Reload()

        requests = [{"plugin": "scalars", "tag": "scalars/tagA"}]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "", requests
        )
        clean_response = self._clean_time_series_responses(response)

        self.assertEqual(
            [
                {
                    "plugin": "scalars",
                    "runToSeries": {
                        "run1": [
                            {
                                "step": 0,
                                "value": 0.0,
                                "wallTime": "<wall_time>",
                            },
                        ],
                        "run2": [
                            {
                                "step": 0,
                                "value": 1.0,
                                "wallTime": "<wall_time>",
                            },
                        ],
                    },
                    "tag": "scalars/tagA",
                }
            ],
            clean_response,
        )

    def test_time_series_multiple_requests(self):
        self._write_scalar_data("run1", "scalars/tagA", [0])
        self._write_scalar_data("run2", "scalars/tagB", [1])

        self._multiplexer.Reload()

        requests = [
            {"plugin": "scalars", "tag": "scalars/tagA"},
            {"plugin": "scalars", "tag": "scalars/tagB"},
            {"plugin": "scalars", "tag": "scalars/tagB"},
        ]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "", requests
        )
        clean_response = self._clean_time_series_responses(response)

        self.assertEqual(
            [
                {
                    "plugin": "scalars",
                    "runToSeries": {
                        "run1": [
                            {
                                "step": 0,
                                "value": 0.0,
                                "wallTime": "<wall_time>",
                            },
                        ],
                    },
                    "tag": "scalars/tagA",
                },
                {
                    "plugin": "scalars",
                    "runToSeries": {
                        "run2": [
                            {
                                "step": 0,
                                "value": 1.0,
                                "wallTime": "<wall_time>",
                            },
                        ],
                    },
                    "tag": "scalars/tagB",
                },
                {
                    "plugin": "scalars",
                    "runToSeries": {
                        "run2": [
                            {
                                "step": 0,
                                "value": 1.0,
                                "wallTime": "<wall_time>",
                            },
                        ],
                    },
                    "tag": "scalars/tagB",
                },
            ],
            clean_response,
        )

    def test_time_series_single_request_specific_run(self):
        self._write_scalar_data("run1", "scalars/tagA", [0])
        self._write_scalar_data("run2", "scalars/tagA", [1])

        self._multiplexer.Reload()

        requests = [{"plugin": "scalars", "tag": "scalars/tagA", "run": "run2"}]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "", requests
        )
        clean_response = self._clean_time_series_responses(response)

        self.assertEqual(
            [
                {
                    "plugin": "scalars",
                    "runToSeries": {
                        "run2": [
                            {
                                "step": 0,
                                "value": 1.0,
                                "wallTime": "<wall_time>",
                            },
                        ],
                    },
                    "tag": "scalars/tagA",
                    "run": "run2",
                }
            ],
            clean_response,
        )

    def test_image_data(self):
        self._write_image("run1", "images/tagA", 1, None)
        self._multiplexer.Reload()

        # Get the blob_key manually.
        image_id = self._get_image_blob_key(
            "run1", "images/tagA", step=0, sample=0
        )
        (data, content_type) = self._plugin._image_data_impl(
            context.RequestContext(), image_id
        )

        self.assertIsInstance(data, bytes)
        self.assertEqual(content_type, "image/png")
        self.assertGreater(len(data), 0)

    def test_time_series_bad_arguments(self):
        requests = [
            {"plugin": "images"},
            {"plugin": "unknown_plugin", "tag": "tagA"},
        ]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "expid", requests
        )
        errors = [
            series_response.get("error", "") for series_response in response
        ]

        self.assertEqual(errors, ["Missing tag", "Invalid plugin"])

    def test_image_data_from_time_series_query(self):
        self._write_image("run1", "images/tagA", samples=3)
        self._multiplexer.Reload()

        requests = [
            {
                "plugin": "images",
                "tag": "images/tagA",
                "run": "run1",
                "sample": 2,
            }
        ]
        original_response = self._plugin._time_series_impl(
            context.RequestContext(), "expid", requests
        )
        response = self._plugin._time_series_impl(
            context.RequestContext(), "expid", requests
        )
        clean_response = self._clean_time_series_responses(response)

        self.assertEqual(
            [
                {
                    "plugin": "images",
                    "tag": "images/tagA",
                    "run": "run1",
                    "sample": 2,
                    "runToSeries": {
                        "run1": [
                            {
                                "wallTime": "<wall_time>",
                                "step": 0,
                                "imageId": "<image_id>",
                            }
                        ]
                    },
                }
            ],
            clean_response,
        )

        image_id = original_response[0]["runToSeries"]["run1"][0]["imageId"]
        (data, content_type) = self._plugin._image_data_impl(
            context.RequestContext(), image_id
        )

        self.assertIsInstance(data, bytes)
        self.assertGreater(len(data), 0)

    def test_image_bad_request(self):
        self._write_image("run1", "images/tagA", 1, None)
        self._multiplexer.Reload()

        invalid_sample = 999
        requests = [
            {
                "plugin": "images",
                "tag": "images/tagA",
                "sample": invalid_sample,
                "run": "run1",
            },
            {"plugin": "images", "tag": "images/tagA", "run": "run1"},
            {
                "plugin": "images",
                "tag": "images/tagA",
            },
        ]
        response = self._plugin._time_series_impl(
            context.RequestContext(), "expid", requests
        )
        errors = [
            series_response.get("error", "") for series_response in response
        ]

        self.assertEqual(errors, ["", "Missing sample", "Missing run"])


if __name__ == "__main__":
    tf.test.main()
