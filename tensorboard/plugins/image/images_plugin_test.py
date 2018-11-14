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
"""Tests the Tensorboard images plugin."""

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
from tensorboard.plugins.image import summary
from tensorboard.plugins.image import images_plugin


class ImagesPluginTest(tf.test.TestCase):

  def setUp(self):
    self.log_dir = tempfile.mkdtemp()

    # We use numpy.random to generate images. We seed to avoid non-determinism
    # in this test.
    numpy.random.seed(42)

    # Create old-style image summaries for run "foo".
    tf.reset_default_graph()
    sess = tf.Session()
    placeholder = tf.placeholder(tf.uint8)
    tf.summary.image(name="baz", tensor=placeholder)
    merged_summary_op = tf.summary.merge_all()
    foo_directory = os.path.join(self.log_dir, "foo")
    writer = tf.summary.FileWriter(foo_directory)
    writer.add_graph(sess.graph)
    for step in xrange(2):
      writer.add_summary(sess.run(merged_summary_op, feed_dict={
          placeholder: (numpy.random.rand(1, 16, 42, 3) * 255).astype(
              numpy.uint8)
      }), global_step=step)
    writer.close()

    # Create new-style image summaries for run bar.
    tf.reset_default_graph()
    sess = tf.Session()
    placeholder = tf.placeholder(tf.uint8)
    summary.op(name="quux", images=placeholder,
               description="how do you pronounce that, anyway?")
    merged_summary_op = tf.summary.merge_all()
    bar_directory = os.path.join(self.log_dir, "bar")
    writer = tf.summary.FileWriter(bar_directory)
    writer.add_graph(sess.graph)
    for step in xrange(2):
      writer.add_summary(sess.run(merged_summary_op, feed_dict={
          placeholder: (numpy.random.rand(1, 8, 6, 3) * 255).astype(
              numpy.uint8)
      }), global_step=step)
    writer.close()

    # Start a server with the plugin.
    multiplexer = event_multiplexer.EventMultiplexer({
        "foo": foo_directory,
        "bar": bar_directory,
    })
    context = base_plugin.TBContext(
        logdir=self.log_dir, multiplexer=multiplexer)
    plugin = images_plugin.ImagesPlugin(context)
    # Setting a reload interval of -1 disables reloading. We disable reloading
    # because we seek to block tests from running til after one reload finishes.
    # This setUp method thus manually reloads the multiplexer. TensorBoard would
    # otherwise reload in a non-blocking thread.
    wsgi_app = application.TensorBoardWSGIApp(
        self.log_dir, [plugin], multiplexer, reload_interval=-1, path_prefix='')
    self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)
    multiplexer.Reload()
    self.routes = plugin.get_plugin_apps()

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
    self.assertIsInstance(self.routes["/images"], collections.Callable)
    self.assertIsInstance(self.routes["/individualImage"], collections.Callable)
    self.assertIsInstance(self.routes["/tags"], collections.Callable)

  def testOldStyleImagesRoute(self):
    """Tests that the /images routes returns correct old-style data."""
    response = self.server.get(
        "/data/plugin/images/images?run=foo&tag=baz/image/0&sample=0")
    self.assertEqual(200, response.status_code)

    # Verify that the correct entries are returned.
    entries = self._DeserializeResponse(response.get_data())
    self.assertEqual(2, len(entries))

    # Verify that the 1st entry is correct.
    entry = entries[0]
    self.assertEqual(42, entry["width"])
    self.assertEqual(16, entry["height"])
    self.assertEqual(0, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["foo"], parsed_query["run"])
    self.assertListEqual(["baz/image/0"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["0"], parsed_query["index"])

    # Verify that the 2nd entry is correct.
    entry = entries[1]
    self.assertEqual(42, entry["width"])
    self.assertEqual(16, entry["height"])
    self.assertEqual(1, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["foo"], parsed_query["run"])
    self.assertListEqual(["baz/image/0"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["1"], parsed_query["index"])

  def testNewStyleImagesRoute(self):
    """Tests that the /images routes returns correct new-style data."""
    response = self.server.get(
        "/data/plugin/images/images?run=bar&tag=quux/image_summary&sample=0")
    self.assertEqual(200, response.status_code)

    # Verify that the correct entries are returned.
    entries = self._DeserializeResponse(response.get_data())
    self.assertEqual(2, len(entries))

    # Verify that the 1st entry is correct.
    entry = entries[0]
    self.assertEqual(6, entry["width"])
    self.assertEqual(8, entry["height"])
    self.assertEqual(0, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["bar"], parsed_query["run"])
    self.assertListEqual(["quux/image_summary"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["0"], parsed_query["index"])

    # Verify that the 2nd entry is correct.
    entry = entries[1]
    self.assertEqual(6, entry["width"])
    self.assertEqual(8, entry["height"])
    self.assertEqual(1, entry["step"])
    parsed_query = urllib.parse.parse_qs(entry["query"])
    self.assertListEqual(["bar"], parsed_query["run"])
    self.assertListEqual(["quux/image_summary"], parsed_query["tag"])
    self.assertListEqual(["0"], parsed_query["sample"])
    self.assertListEqual(["1"], parsed_query["index"])

  def testOldStyleIndividualImageRoute(self):
    """Tests fetching an individual image from an old-style summary."""
    response = self.server.get(
        "/data/plugin/images/individualImage"
        "?run=foo&tag=baz/image/0&sample=0&index=0")
    self.assertEqual(200, response.status_code)
    self.assertEqual("image/png", response.headers.get("content-type"))

  def testNewStyleIndividualImageRoute(self):
    """Tests fetching an individual image from a new-style summary."""
    response = self.server.get(
        "/data/plugin/images/individualImage"
        "?run=bar&tag=quux/image_summary&sample=0&index=0")
    self.assertEqual(200, response.status_code)
    self.assertEqual("image/png", response.headers.get("content-type"))

  def testRunsRoute(self):
    """Tests that the /runs route offers the correct run to tag mapping."""
    response = self.server.get("/data/plugin/images/tags")
    self.assertEqual(200, response.status_code)
    self.assertDictEqual({
        "foo": {
            "baz/image/0": {
                "displayName": "baz/image/0",
                "description": "",
                "samples": 1,
            },
        },
        "bar": {
            "quux/image_summary": {
                "displayName": "quux",
                "description": "<p>how do you pronounce that, anyway?</p>",
                "samples": 1,
            },
        },
    }, self._DeserializeResponse(response.get_data()))


if __name__ == "__main__":
  tf.test.main()
