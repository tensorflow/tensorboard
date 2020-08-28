# -*- coding: utf-8 -*-
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
"""Integration tests for the Text Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections.abc
import os
import numpy as np
import tensorflow as tf

from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.plugins import base_plugin
from tensorboard.plugins.scalar.summary_v2 import scalar
from tensorboard.plugins.text.summary_v2 import text
from tensorboard.plugins.text_v2 import text_v2_plugin


tf.compat.v1.enable_v2_behavior()


GEMS = ["garnet", "amethyst", "pearl", "steven"]


class TextPluginTest(tf.test.TestCase):
    def setUp(self):
        self.logdir = self.get_temp_dir()

    def create_plugin(self, generate_testdata=True, include_text=True):
        """Run a test with a `data_provider`."""
        if generate_testdata:
            self.generate_testdata(include_text=include_text)

        multiplexer = event_multiplexer.EventMultiplexer()
        multiplexer.AddRunsFromDirectory(self.logdir)
        multiplexer.Reload()

        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )

        ctx = base_plugin.TBContext(
            logdir=self.logdir, multiplexer=multiplexer, data_provider=provider,
        )

        return text_v2_plugin.TextV2Plugin(ctx)

    def generate_testdata(self, include_text=True, logdir=None):
        run_names = ["fry", "leela"]
        for run_name in run_names:
            subdir = os.path.join(self.logdir, run_name)
            writer = tf.compat.v2.summary.create_file_writer(subdir)

            with writer.as_default():
                step = 0
                for gem in GEMS:
                    message = run_name + " *loves* " + gem
                    if include_text:
                        text("message", message, step)
                    step += 1

                vector_message = ["one", "two", "three", "four"]
                if include_text:
                    text("vector", vector_message, 0)

                scalar("twelve", tf.constant(12), 0)

            writer.close()

    def testRoutesProvided(self):
        plugin = self.create_plugin()
        routes = plugin.get_plugin_apps()
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)
        self.assertIsInstance(routes["/text"], collections.abc.Callable)

    def testIndex(self):
        plugin = self.create_plugin()
        index = plugin.index_impl(context.RequestContext(), experiment="123")
        self.assertItemsEqual(["fry", "leela"], index.keys())
        self.assertItemsEqual(["message", "vector"], index["fry"])
        self.assertItemsEqual(["message", "vector"], index["leela"])

    def testText(self):
        plugin = self.create_plugin()
        ctx = context.RequestContext()
        fry = plugin.text_impl(ctx, "fry", "message", experiment="123")
        leela = plugin.text_impl(ctx, "leela", "message", experiment="123")
        self.assertEqual(len(fry), 4)
        self.assertEqual(len(leela), 4)
        for i in range(4):
            self.assertEqual(fry[i]["step"], i)
            self.assertEqual(leela[i]["step"], i)

        fry_event_data = plugin.text_impl(
            ctx, "fry", "vector", experiment="123"
        )[0]

        self.assertEqual(
            fry_event_data["string_array"], [b"one", b"two", b"three", b"four"]
        )
        self.assertEqual(fry_event_data["original_shape"], (4,))
        self.assertEqual(fry_event_data["truncated"], False)

    def test_reduce_to_2d(self):
        def make_range_array(dim):
            """Produce an incrementally increasing multidimensional array.

            Args:
              dim: the number of dimensions for the array

            Returns:
              An array of increasing integer elements, with dim dimensions and size
              two in each dimension.

            Example: rangeArray(2) results in [[0,1],[2,3]].
            """
            return np.array(range(2 ** dim)).reshape([2] * dim)

        for i in range(2, 5):
            actual = text_v2_plugin.reduce_to_2d(make_range_array(i))
            expected = make_range_array(2)
            np.testing.assert_array_equal(actual, expected)

    def test_reduce_and_jsonify(self):
        convert = text_v2_plugin.reduce_and_jsonify
        scalar = np.array("foo")
        scalar_expected = ("foo", (), False)
        self.assertEqual(convert(scalar), scalar_expected)

        vector = np.array(["foo", "bar"])
        vector_expected = (["foo", "bar"], (2,), False)
        self.assertEqual(convert(vector), vector_expected)

        d2 = np.array([["foo", "bar"], ["zoink", "zod"]])
        d2_expected = ([["foo", "bar"], ["zoink", "zod"]], (2, 2), False)
        self.assertEqual(convert(d2), d2_expected)

        d3 = np.array(
            [
                [["foo", "bar"], ["zoink", "zod"]],
                [["FOO", "BAR"], ["ZOINK", "ZOD"]],
            ]
        )

        d3_expected = ([["foo", "bar"], ["zoink", "zod"]], (2, 2, 2), True)
        self.assertEqual(convert(d3), d3_expected)

    def testIsActiveReturnsFalse(self):
        """The plugin should always return false because this is now handled
        by TensorBoard core."""
        plugin = self.create_plugin(generate_testdata=False)
        self.assertFalse(plugin.is_active())


if __name__ == "__main__":
    tf.test.main()
