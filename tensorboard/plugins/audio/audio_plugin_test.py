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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json
import os
import shutil
import tempfile

import numpy
from six.moves import urllib
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.audio import summary
from tensorboard.plugins.audio import audio_plugin


class AudioPluginTest(tf.test.TestCase):

  def setUp(self):
    self.log_dir = tempfile.mkdtemp()

    # We use numpy.random to generate audio. We seed to avoid non-determinism
    # in this test.
    numpy.random.seed(42)

    # Create old-style audio summaries for run "foo".
    tf.reset_default_graph()
    sess = tf.Session()
    placeholder = tf.placeholder(tf.float32)
    tf.summary.audio(name="baz", tensor=placeholder, sample_rate=44100)
    merged_summary_op = tf.summary.merge_all()
    foo_directory = os.path.join(self.log_dir, "foo")
    writer = tf.summary.FileWriter(foo_directory)
    writer.add_graph(sess.graph)
    for step in xrange(2):
      # The floats (sample data) range from -1 to 1.
      writer.add_summary(sess.run(merged_summary_op, feed_dict={
          placeholder: numpy.random.rand(42, 22050) * 2 - 1
      }), global_step=step)
    writer.close()

    # Create new-style audio summaries for run "bar".
    tf.reset_default_graph()
    sess = tf.Session()
    audio_placeholder = tf.placeholder(tf.float32)
    labels_placeholder = tf.placeholder(tf.string)
    summary.op("quux", audio_placeholder, sample_rate=44100,
               labels=labels_placeholder,
               description="how do you pronounce that, anyway?")
    merged_summary_op = tf.summary.merge_all()
    bar_directory = os.path.join(self.log_dir, "bar")
    writer = tf.summary.FileWriter(bar_directory)
    writer.add_graph(sess.graph)
    for step in xrange(2):
      # The floats (sample data) range from -1 to 1.
      writer.add_summary(sess.run(merged_summary_op, feed_dict={
          audio_placeholder: numpy.random.rand(42, 11025, 1) * 2 - 1,
          labels_placeholder: [
              tf.compat.as_bytes('step **%s**, sample %s' % (step, sample))
              for sample in xrange(42)
          ],
      }), global_step=step)
    writer.close()

    # Start a server with the plugin.
    multiplexer = event_multiplexer.EventMultiplexer({
        "foo": foo_directory,
        "bar": bar_directory,
    })
    context = base_plugin.TBContext(
        logdir=self.log_dir, multiplexer=multiplexer)
    self.plugin = audio_plugin.AudioPlugin(context)
    # Setting a reload interval of -1 disables reloading. We disable reloading
    # because we seek to block tests from running til after one reload finishes.
    # This setUp method thus manually reloads the multiplexer. TensorBoard would
    # otherwise reload in a non-blocking thread.
    wsgi_app = application.TensorBoardWSGIApp(
        self.log_dir, [self.plugin], multiplexer, reload_interval=-1,
        path_prefix='')
    self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)
    multiplexer.Reload()

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
    self.assertIsInstance(routes["/audio"], collections.Callable)
    self.assertIsInstance(routes["/individualAudio"], collections.Callable)
    self.assertIsInstance(routes["/tags"], collections.Callable)

  def testOldStyleAudioRoute(self):
    """Tests that the /audio routes returns correct old-style data."""
    response = self.server.get(
        "/data/plugin/audio/audio?run=foo&tag=baz/audio/0&sample=0")
    self.assertEqual(200, response.status_code)

    # Verify that the correct entries are returned.
    entries = self._DeserializeResponse(response.get_data())
    self.assertEqual(2, len(entries))

    # Verify that the 1st entry is correct.
    entry = entries[0]
    self.assertEqual("audio/wav", entry["contentType"])
    self.assertEqual("", entry["label"])
    self.assertEqual(0, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["foo"], parsed_query["run"])
    self.assertListEqual(["baz/audio/0"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["0"], parsed_query["index"])

    # Verify that the 2nd entry is correct.
    entry = entries[1]
    self.assertEqual("audio/wav", entry["contentType"])
    self.assertEqual("", entry["label"])
    self.assertEqual(1, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["foo"], parsed_query["run"])
    self.assertListEqual(["baz/audio/0"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["1"], parsed_query["index"])

  def testNewStyleAudioRoute(self):
    """Tests that the /audio routes returns correct new-style data."""
    response = self.server.get(
        "/data/plugin/audio/audio?run=bar&tag=quux/audio_summary&sample=0")
    self.assertEqual(200, response.status_code)

    # Verify that the correct entries are returned.
    entries = self._DeserializeResponse(response.get_data())
    self.assertEqual(2, len(entries))

    # Verify that the 1st entry is correct.
    entry = entries[0]
    self.assertEqual("audio/wav", entry["contentType"])
    self.assertEqual(
        "<p>step <strong>%s</strong>, sample 0</p>" % entry["step"],
        entry["label"])
    self.assertEqual(0, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["bar"], parsed_query["run"])
    self.assertListEqual(["quux/audio_summary"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["0"], parsed_query["index"])

    # Verify that the 2nd entry is correct.
    entry = entries[1]
    self.assertEqual("audio/wav", entry["contentType"])
    self.assertEqual(
        "<p>step <strong>%s</strong>, sample 0</p>" % entry["step"],
        entry["label"])
    self.assertEqual(1, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["bar"], parsed_query["run"])
    self.assertListEqual(["quux/audio_summary"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["1"], parsed_query["index"])

  def testOldStyleIndividualAudioRoute(self):
    """Tests fetching an individual audio clip from an old-style summary."""
    response = self.server.get(
        "/data/plugin/audio/individualAudio"
        "?run=foo&tag=baz/audio/0&sample=0&index=0")
    self.assertEqual(200, response.status_code)
    self.assertEqual("audio/wav", response.headers.get("content-type"))

  def testNewStyleIndividualAudioRoute(self):
    """Tests fetching an individual audio clip from an old-style summary."""
    response = self.server.get(
        "/data/plugin/audio/individualAudio"
        "?run=bar&tag=quux/audio_summary&sample=0&index=0")
    self.assertEqual(200, response.status_code)
    self.assertEqual("audio/wav", response.headers.get("content-type"))

  def testTagsRoute(self):
    """Tests that the /tags route offers the correct run to tag mapping."""
    response = self.server.get("/data/plugin/audio/tags")
    self.assertEqual(200, response.status_code)
    self.assertDictEqual({
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
    }, self._DeserializeResponse(response.get_data()))


if __name__ == "__main__":
  tf.test.main()
