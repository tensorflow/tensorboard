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
"""Integration tests for the Text Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections.abc
import os
import textwrap
import numpy as np
import tensorflow as tf

from tensorboard import plugin_util
from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.plugins import base_plugin
from tensorboard.plugins.text import text_plugin
from tensorboard.util import test_util

tf.compat.v1.disable_v2_behavior()

GEMS = ["garnet", "amethyst", "pearl", "steven"]


class TextPluginTest(tf.test.TestCase):
    def setUp(self):
        self.logdir = self.get_temp_dir()

    def load_plugin(self):
        self.generate_testdata()
        multiplexer = event_multiplexer.EventMultiplexer()
        multiplexer.AddRunsFromDirectory(self.logdir)
        multiplexer.Reload()
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.logdir
        )
        ctx = base_plugin.TBContext(logdir=self.logdir, data_provider=provider)
        return text_plugin.TextPlugin(ctx)

    def generate_testdata(self, logdir=None):
        tf.compat.v1.reset_default_graph()
        sess = tf.compat.v1.Session()
        placeholder = tf.compat.v1.placeholder(tf.string)
        summary_tensor = tf.compat.v1.summary.text("message", placeholder)
        vector_summary = tf.compat.v1.summary.text("vector", placeholder)
        scalar_summary = tf.compat.v1.summary.scalar("twelve", tf.constant(12))

        run_names = ["fry", "leela"]
        for run_name in run_names:
            subdir = os.path.join(self.logdir, run_name)
            with test_util.FileWriterCache.get(subdir) as writer:
                writer.add_graph(sess.graph)

                step = 0
                for gem in GEMS:
                    message = run_name + " *loves* " + gem
                    feed_dict = {
                        placeholder: message,
                    }
                    summ = sess.run(summary_tensor, feed_dict=feed_dict)
                    writer.add_summary(summ, global_step=step)
                    step += 1

                vector_message = ["one", "two", "three", "four"]
                summ = sess.run(
                    vector_summary, feed_dict={placeholder: vector_message}
                )
                writer.add_summary(summ)

                summ = sess.run(scalar_summary, feed_dict={placeholder: []})
                writer.add_summary(summ)

    def testRoutesProvided(self):
        plugin = self.load_plugin()
        routes = plugin.get_plugin_apps()
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)
        self.assertIsInstance(routes["/text"], collections.abc.Callable)

    def testIndex(self):
        plugin = self.load_plugin()
        index = plugin.index_impl(context.RequestContext(), experiment="123")
        self.assertItemsEqual(["fry", "leela"], index.keys())
        self.assertItemsEqual(["message", "vector"], index["fry"])
        self.assertItemsEqual(["message", "vector"], index["leela"])

    def testText(self):
        plugin = self.load_plugin()
        fry = plugin.text_impl(
            context.RequestContext(), "fry", "message", experiment="123"
        )
        leela = plugin.text_impl(
            context.RequestContext(), "leela", "message", experiment="123"
        )
        self.assertEqual(len(fry), 4)
        self.assertEqual(len(leela), 4)
        for i in range(4):
            self.assertEqual(fry[i]["step"], i)
            self.assertEqual(leela[i]["step"], i)

        table = plugin.text_impl(
            context.RequestContext(), "fry", "vector", experiment="123"
        )[0]["text"]
        self.assertEqual(
            table,
            textwrap.dedent(
                """\
                <table>
                <tbody>
                <tr>
                <td><p>one</p></td>
                </tr>
                <tr>
                <td><p>two</p></td>
                </tr>
                <tr>
                <td><p>three</p></td>
                </tr>
                <tr>
                <td><p>four</p></td>
                </tr>
                </tbody>
                </table>
                """.rstrip()
            ),
        )

    def testTableGeneration(self):
        array2d = np.array([["one", "two"], ["three", "four"]])
        expected_table = textwrap.dedent(
            """\
            <table>
            <tbody>
            <tr>
            <td>one</td>
            <td>two</td>
            </tr>
            <tr>
            <td>three</td>
            <td>four</td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )
        self.assertEqual(text_plugin.make_table(array2d), expected_table)

        expected_table_with_headers = textwrap.dedent(
            """\
            <table>
            <thead>
            <tr>
            <th>c1</th>
            <th>c2</th>
            </tr>
            </thead>
            <tbody>
            <tr>
            <td>one</td>
            <td>two</td>
            </tr>
            <tr>
            <td>three</td>
            <td>four</td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )

        actual_with_headers = text_plugin.make_table(
            array2d, headers=["c1", "c2"]
        )
        self.assertEqual(actual_with_headers, expected_table_with_headers)

        array_1d = np.array(["one", "two", "three", "four", "five"])
        expected_1d = textwrap.dedent(
            """\
            <table>
            <tbody>
            <tr>
            <td>one</td>
            </tr>
            <tr>
            <td>two</td>
            </tr>
            <tr>
            <td>three</td>
            </tr>
            <tr>
            <td>four</td>
            </tr>
            <tr>
            <td>five</td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )
        self.assertEqual(text_plugin.make_table(array_1d), expected_1d)

        expected_1d_with_headers = textwrap.dedent(
            """\
            <table>
            <thead>
            <tr>
            <th>X</th>
            </tr>
            </thead>
            <tbody>
            <tr>
            <td>one</td>
            </tr>
            <tr>
            <td>two</td>
            </tr>
            <tr>
            <td>three</td>
            </tr>
            <tr>
            <td>four</td>
            </tr>
            <tr>
            <td>five</td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )
        actual_1d_with_headers = text_plugin.make_table(array_1d, headers=["X"])
        self.assertEqual(actual_1d_with_headers, expected_1d_with_headers)

    def testMakeTableExceptions(self):
        # Verify that contents is being type-checked and shape-checked.
        with self.assertRaises(ValueError):
            text_plugin.make_table([])

        with self.assertRaises(ValueError):
            text_plugin.make_table("foo")

        with self.assertRaises(ValueError):
            invalid_shape = np.full((3, 3, 3), "nope", dtype=np.dtype("S3"))
            text_plugin.make_table(invalid_shape)

        # Test headers exceptions in 2d array case.
        test_array = np.full((3, 3), "foo", dtype=np.dtype("S3"))
        with self.assertRaises(ValueError):
            # Headers is wrong type.
            text_plugin.make_table(test_array, headers="foo")
        with self.assertRaises(ValueError):
            # Too many headers.
            text_plugin.make_table(
                test_array, headers=["foo", "bar", "zod", "zoink"]
            )
        with self.assertRaises(ValueError):
            # headers is 2d
            text_plugin.make_table(test_array, headers=test_array)

        # Also make sure the column counting logic works in the 1d array case.
        test_array = np.array(["foo", "bar", "zod"])
        with self.assertRaises(ValueError):
            # Too many headers.
            text_plugin.make_table(test_array, headers=test_array)

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
            actual = text_plugin.reduce_to_2d(make_range_array(i))
            expected = make_range_array(2)
            np.testing.assert_array_equal(actual, expected)

    def test_text_array_to_html(self):
        convert = text_plugin.text_array_to_html
        scalar = np.array("foo")
        scalar_expected = "<p>foo</p>"
        self.assertEqual(convert(scalar), scalar_expected)

        # Check that underscores are preserved correctly; this detects erroneous
        # use of UTF-16 or UTF-32 encoding when calling markdown_to_safe_html(),
        # which would introduce spurious null bytes and cause undesired <em> tags
        # around the underscores.
        scalar_underscores = np.array("word_with_underscores")
        scalar_underscores_expected = "<p>word_with_underscores</p>"
        self.assertEqual(
            convert(scalar_underscores), scalar_underscores_expected
        )

        vector = np.array(["foo", "bar"])
        vector_expected = textwrap.dedent(
            """\
            <table>
            <tbody>
            <tr>
            <td><p>foo</p></td>
            </tr>
            <tr>
            <td><p>bar</p></td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )
        self.assertEqual(convert(vector), vector_expected)

        d2 = np.array([["foo", "bar"], ["zoink", "zod"]])
        d2_expected = textwrap.dedent(
            """\
            <table>
            <tbody>
            <tr>
            <td><p>foo</p></td>
            <td><p>bar</p></td>
            </tr>
            <tr>
            <td><p>zoink</p></td>
            <td><p>zod</p></td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )
        self.assertEqual(convert(d2), d2_expected)

        d3 = np.array(
            [
                [["foo", "bar"], ["zoink", "zod"]],
                [["FOO", "BAR"], ["ZOINK", "ZOD"]],
            ]
        )

        warning = plugin_util.markdown_to_safe_html(
            text_plugin.WARNING_TEMPLATE % 3
        )
        d3_expected = warning + textwrap.dedent(
            """\
            <table>
            <tbody>
            <tr>
            <td><p>foo</p></td>
            <td><p>bar</p></td>
            </tr>
            <tr>
            <td><p>zoink</p></td>
            <td><p>zod</p></td>
            </tr>
            </tbody>
            </table>
            """.rstrip()
        )
        self.assertEqual(convert(d3), d3_expected)

    def testPluginIndexImpl(self):
        plugin = self.load_plugin()
        run_to_tags = plugin.index_impl(
            context.RequestContext(), experiment="123"
        )
        self.assertItemsEqual(["fry", "leela"], run_to_tags.keys())
        self.assertItemsEqual(["message", "vector"], run_to_tags["fry"])
        self.assertItemsEqual(["message", "vector"], run_to_tags["leela"])


if __name__ == "__main__":
    tf.test.main()
