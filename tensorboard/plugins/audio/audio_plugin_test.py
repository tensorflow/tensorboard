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
"""Tests the Tensorboard audio plugin."""


import collections.abc
import json
import os
import shutil
import tempfile
import urllib.parse

import numpy
import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.backend.event_processing import data_provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.audio import audio_plugin
from tensorboard.plugins.audio import summary
from tensorboard.util import test_util


class AudioPluginTest(tf.test.TestCase):
    def setUp(self):
        self.log_dir = tempfile.mkdtemp()

        # We use numpy.random to generate audio. We seed to avoid non-determinism
        # in this test.
        numpy.random.seed(42)

        # Create old-style audio summaries for run "foo".
        tf.compat.v1.reset_default_graph()
        with tf.compat.v1.Graph().as_default():
            sess = tf.compat.v1.Session()
            placeholder = tf.compat.v1.placeholder(tf.float32)
            tf.compat.v1.summary.audio(
                name="baz", tensor=placeholder, sample_rate=44100
            )
            merged_summary_op = tf.compat.v1.summary.merge_all()
            foo_directory = os.path.join(self.log_dir, "foo")
            with test_util.FileWriterCache.get(foo_directory) as writer:
                writer.add_graph(sess.graph)
                for step in range(2):
                    # The floats (sample data) range from -1 to 1.
                    writer.add_summary(
                        sess.run(
                            merged_summary_op,
                            feed_dict={
                                placeholder: numpy.random.rand(42, 22050) * 2
                                - 1
                            },
                        ),
                        global_step=step,
                    )

        # Create new-style audio summaries for run "bar".
        tf.compat.v1.reset_default_graph()
        with tf.compat.v1.Graph().as_default():
            sess = tf.compat.v1.Session()
            audio_placeholder = tf.compat.v1.placeholder(tf.float32)
            labels_placeholder = tf.compat.v1.placeholder(tf.string)
            summary.op(
                "quux",
                audio_placeholder,
                sample_rate=44100,
                labels=labels_placeholder,
                description="how do you pronounce that, anyway?",
            )
            merged_summary_op = tf.compat.v1.summary.merge_all()
            bar_directory = os.path.join(self.log_dir, "bar")
            with test_util.FileWriterCache.get(bar_directory) as writer:
                writer.add_graph(sess.graph)
                for step in range(2):
                    # The floats (sample data) range from -1 to 1.
                    writer.add_summary(
                        sess.run(
                            merged_summary_op,
                            feed_dict={
                                audio_placeholder: numpy.random.rand(
                                    42, 11025, 1
                                )
                                * 2
                                - 1,
                                labels_placeholder: [
                                    tf.compat.as_bytes(
                                        "step **%s**, sample %s"
                                        % (step, sample)
                                    )
                                    for sample in range(42)
                                ],
                            },
                        ),
                        global_step=step,
                    )

        # Start a server with the plugin.
        multiplexer = event_multiplexer.EventMultiplexer(
            {
                "foo": foo_directory,
                "bar": bar_directory,
            }
        )
        multiplexer.Reload()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.log_dir
        )
        context = base_plugin.TBContext(
            logdir=self.log_dir, data_provider=provider
        )
        self.plugin = audio_plugin.AudioPlugin(context)
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(wsgi_app, wrappers.Response)

    def tearDown(self):
        shutil.rmtree(self.log_dir, ignore_errors=True)

    def _DeserializeResponse(self, byte_content):
        """Deserializes byte content that is a JSON encoding.

        Args:
          byte_content: The byte content of a response.

        Returns:
          The deserialized python object decoded from JSON.
        """
        return json.loads(byte_content.decode("utf-8"))

    def testRoutesProvided(self):
        """Tests that the plugin offers the correct routes."""
        routes = self.plugin.get_plugin_apps()
        self.assertIsInstance(routes["/audio"], collections.abc.Callable)
        self.assertIsInstance(
            routes["/individualAudio"], collections.abc.Callable
        )
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)

    def testOldStyleAudioRoute(self):
        """Tests that the /audio routes returns correct old-style data."""
        response = self.server.get(
            "/data/plugin/audio/audio?run=foo&tag=baz/audio/0&sample=0"
        )
        self.assertEqual(200, response.status_code)

        # Verify that the correct entries are returned.
        entries = self._DeserializeResponse(response.get_data())
        self.assertEqual(2, len(entries))

        # Verify that the 1st entry is correct.
        entry = entries[0]
        self.assertEqual("audio/wav", entry["contentType"])
        self.assertEqual("", entry["label"])
        self.assertEqual(0, entry["step"])
        urllib.parse.parse_qs(entry["query"])  # should parse

        # Verify that the 2nd entry is correct.
        entry = entries[1]
        self.assertEqual("audio/wav", entry["contentType"])
        self.assertEqual("", entry["label"])
        self.assertEqual(1, entry["step"])
        urllib.parse.parse_qs(entry["query"])  # should parse

    def testNewStyleAudioRoute(self):
        """Tests that the /audio routes returns correct new-style data."""
        response = self.server.get(
            "/data/plugin/audio/audio?run=bar&tag=quux/audio_summary&sample=0"
        )
        self.assertEqual(200, response.status_code)

        # Verify that the correct entries are returned.
        entries = self._DeserializeResponse(response.get_data())
        self.assertEqual(2, len(entries))

        # Verify that the 1st entry is correct.
        entry = entries[0]
        self.assertEqual("audio/wav", entry["contentType"])
        self.assertEqual("", entry["label"])
        self.assertEqual(0, entry["step"])
        urllib.parse.parse_qs(entry["query"])  # should parse

        # Verify that the 2nd entry is correct.
        entry = entries[1]
        self.assertEqual("audio/wav", entry["contentType"])
        self.assertEqual("", entry["label"])
        self.assertEqual(1, entry["step"])
        urllib.parse.parse_qs(entry["query"])  # should parse

    def testOldStyleIndividualAudioRoute(self):
        """Tests fetching an individual audio clip from an old-style
        summary."""
        response = self.server.get(
            "/data/plugin/audio/audio?run=foo&tag=baz/audio/0&sample=0"
        )
        self.assertEqual(200, response.status_code)
        entries = self._DeserializeResponse(response.get_data())
        query_string = entries[0]["query"]
        response = self.server.get(
            "/data/plugin/audio/individualAudio?" + query_string
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("audio/wav", response.headers.get("content-type"))

    def testNewStyleIndividualAudioRoute(self):
        """Tests fetching an individual audio clip from a new-style
        summary."""
        response = self.server.get(
            "/data/plugin/audio/audio?run=bar&tag=quux/audio_summary&sample=0"
        )
        self.assertEqual(200, response.status_code)
        entries = self._DeserializeResponse(response.get_data())
        query_string = entries[0]["query"]
        response = self.server.get(
            "/data/plugin/audio/individualAudio?" + query_string
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("audio/wav", response.headers.get("content-type"))

    def testRequestBadContentType(self):
        """Ensure that malicious clients can't request a non-audio MIME type."""
        response = self.server.get(
            "/data/plugin/audio/audio?run=bar&tag=quux/audio_summary&sample=0"
        )
        self.assertEqual(200, response.status_code)
        entries = self._DeserializeResponse(response.get_data())
        query_parts = urllib.parse.parse_qs(entries[0]["query"])
        self.assertIn("content_type", query_parts)
        query_parts["content-type"] = "application/javascript"
        malicious_query = urllib.parse.urlencode(query_parts)
        response = self.server.get(
            "/data/plugin/audio/individualAudio?" + malicious_query
        )
        self.assertEqual(400, response.status_code)
        self.assertIn(b"Illegal mime type", response.get_data())

    def testTagsRoute(self):
        """Tests that the /tags route offers the correct run to tag mapping."""
        response = self.server.get("/data/plugin/audio/tags")
        self.assertEqual(200, response.status_code)
        self.assertDictEqual(
            {
                "foo": {
                    "baz/audio/0": {
                        "displayName": "baz/audio/0",
                        "description": "",
                        "samples": 1,
                    },
                    "baz/audio/1": {
                        "displayName": "baz/audio/1",
                        "description": "",
                        "samples": 1,
                    },
                    "baz/audio/2": {
                        "displayName": "baz/audio/2",
                        "description": "",
                        "samples": 1,
                    },
                },
                "bar": {
                    "quux/audio_summary": {
                        "displayName": "quux",
                        "description": "<p>how do you pronounce that, anyway?</p>",
                        "samples": 3,  # 42 inputs, but max_outputs=3
                    },
                },
            },
            self._DeserializeResponse(response.get_data()),
        )


if __name__ == "__main__":
    tf.test.main()
