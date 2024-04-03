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
"""Integration tests for the Custom Scalars Plugin."""


import csv
import io
import json
import os

import numpy as np
import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from google.protobuf import json_format
from tensorboard.backend import application
from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.plugins import base_plugin
from tensorboard.plugins.custom_scalar import custom_scalars_plugin
from tensorboard.plugins.custom_scalar import layout_pb2
from tensorboard.plugins.custom_scalar import summary
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.scalar import summary as scalar_summary
from tensorboard.util import test_util

tf.compat.v1.disable_v2_behavior()


class CustomScalarsPluginTest(tf.test.TestCase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logdir = os.path.join(self.get_temp_dir(), "logdir")
        os.makedirs(self.logdir)

        self.logdir_layout = layout_pb2.Layout(
            category=[
                layout_pb2.Category(
                    title="cross entropy",
                    chart=[
                        layout_pb2.Chart(
                            title="cross entropy",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"cross entropy"],
                            ),
                        ),
                    ],
                    closed=True,
                )
            ]
        )
        self.foo_layout = layout_pb2.Layout(
            category=[
                layout_pb2.Category(
                    title="mean biases",
                    chart=[
                        layout_pb2.Chart(
                            title="mean layer biases",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[
                                    r"mean/layer0/biases",
                                    r"mean/layer1/biases",
                                ],
                            ),
                        ),
                    ],
                ),
                layout_pb2.Category(
                    title="std weights",
                    chart=[
                        layout_pb2.Chart(
                            title="stddev layer weights",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"stddev/layer\d+/weights"],
                            ),
                        ),
                    ],
                ),
                # A category with this name is also present in a layout for a
                # different run (the logdir run) and also contains a duplicate chart
                layout_pb2.Category(
                    title="cross entropy",
                    chart=[
                        layout_pb2.Chart(
                            title="cross entropy margin chart",
                            margin=layout_pb2.MarginChartContent(
                                series=[
                                    layout_pb2.MarginChartContent.Series(
                                        value="cross entropy",
                                        lower="cross entropy lower",
                                        upper="cross entropy upper",
                                    ),
                                ],
                            ),
                        ),
                        layout_pb2.Chart(
                            title="cross entropy",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"cross entropy"],
                            ),
                        ),
                    ],
                ),
            ]
        )

        # Generate test data.
        with test_util.FileWriterCache.get(
            os.path.join(self.logdir, "foo")
        ) as writer:
            writer.add_summary(
                test_util.ensure_tb_summary_proto(summary.pb(self.foo_layout))
            )
            for step in range(4):
                writer.add_summary(
                    test_util.ensure_tb_summary_proto(
                        scalar_summary.pb("squares", step * step)
                    ),
                    step,
                )

        with test_util.FileWriterCache.get(
            os.path.join(self.logdir, "bar")
        ) as writer:
            for step in range(3):
                writer.add_summary(
                    test_util.ensure_tb_summary_proto(
                        scalar_summary.pb("increments", step + 1)
                    ),
                    step,
                )

        # The '.' run lacks scalar data but has a layout.
        with test_util.FileWriterCache.get(self.logdir) as writer:
            writer.add_summary(
                test_util.ensure_tb_summary_proto(
                    summary.pb(self.logdir_layout)
                )
            )

        self.plugin = self.createPlugin(self.logdir)

    def createPlugin(self, logdir):
        multiplexer = event_multiplexer.EventMultiplexer()
        multiplexer.AddRunsFromDirectory(logdir)
        multiplexer.Reload()
        provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
        plugin_name_to_instance = {}
        context = base_plugin.TBContext(
            logdir=logdir,
            data_provider=provider,
            plugin_name_to_instance=plugin_name_to_instance,
        )
        scalars_plugin_instance = scalars_plugin.ScalarsPlugin(context)
        custom_scalars_plugin_instance = (
            custom_scalars_plugin.CustomScalarsPlugin(context)
        )
        plugin_instances = [
            scalars_plugin_instance,
            custom_scalars_plugin_instance,
        ]
        for plugin_instance in plugin_instances:
            plugin_name_to_instance[plugin_instance.plugin_name] = (
                plugin_instance
            )
        return custom_scalars_plugin_instance

    def test_download_url_json(self):
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        server = werkzeug_test.Client(wsgi_app, wrappers.Response)
        response = server.get(
            "/data/plugin/custom_scalars/download_data?run=%s&tag=%s"
            % ("foo", "squares/scalar_summary")
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        body = json.loads(response.get_data())
        self.assertEqual(4, len(body))
        for step, entry in enumerate(body):
            # The time stamp should be reasonable.
            self.assertGreater(entry[0], 0)
            self.assertEqual(step, entry[1])
            np.testing.assert_allclose(step * step, entry[2])

    def test_download_url_csv(self):
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        server = werkzeug_test.Client(wsgi_app, wrappers.Response)
        response = server.get(
            "/data/plugin/custom_scalars/download_data?run=%s&tag=%s&format=csv"
            % ("foo", "squares/scalar_summary")
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "text/csv; charset=utf-8", response.headers["Content-Type"]
        )
        payload = response.get_data()
        s = io.StringIO(payload.decode("utf-8"))
        reader = csv.reader(s)
        self.assertEqual(["Wall time", "Step", "Value"], next(reader))
        self.assertEqual(len(list(reader)), 4)

    def testScalars(self):
        ctx = context.RequestContext()
        body = self.plugin.scalars_impl(ctx, "bar", "increments", "exp_id")
        self.assertTrue(body["regex_valid"])
        self.assertCountEqual(
            ["increments/scalar_summary"], list(body["tag_to_events"].keys())
        )
        data = body["tag_to_events"]["increments/scalar_summary"]
        for step, entry in enumerate(data):
            # The time stamp should be reasonable.
            self.assertGreater(entry[0], 0)
            self.assertEqual(step, entry[1])
            np.testing.assert_allclose(step + 1, entry[2])

    def testMergedLayout(self):
        ctx = context.RequestContext()
        parsed_layout = layout_pb2.Layout()
        json_format.Parse(self.plugin.layout_impl(ctx, "exp_id"), parsed_layout)
        correct_layout = layout_pb2.Layout(
            category=[
                # A category with this name is also present in a layout for a
                # different run (the logdir run)
                layout_pb2.Category(
                    title="cross entropy",
                    chart=[
                        layout_pb2.Chart(
                            title="cross entropy",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"cross entropy"],
                            ),
                        ),
                        layout_pb2.Chart(
                            title="cross entropy margin chart",
                            margin=layout_pb2.MarginChartContent(
                                series=[
                                    layout_pb2.MarginChartContent.Series(
                                        value="cross entropy",
                                        lower="cross entropy lower",
                                        upper="cross entropy upper",
                                    ),
                                ],
                            ),
                        ),
                    ],
                    closed=True,
                ),
                layout_pb2.Category(
                    title="mean biases",
                    chart=[
                        layout_pb2.Chart(
                            title="mean layer biases",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[
                                    r"mean/layer0/biases",
                                    r"mean/layer1/biases",
                                ],
                            ),
                        ),
                    ],
                ),
                layout_pb2.Category(
                    title="std weights",
                    chart=[
                        layout_pb2.Chart(
                            title="stddev layer weights",
                            multiline=layout_pb2.MultilineChartContent(
                                tag=[r"stddev/layer\d+/weights"],
                            ),
                        ),
                    ],
                ),
            ]
        )
        self.assertProtoEquals(correct_layout, parsed_layout)

    def testLayoutFromSingleRun(self):
        # The foo directory contains 1 single layout.
        ctx = context.RequestContext()
        local_plugin = self.createPlugin(os.path.join(self.logdir, "foo"))
        parsed_layout = layout_pb2.Layout()
        json_format.Parse(
            local_plugin.layout_impl(ctx, "exp_id"), parsed_layout
        )
        self.assertProtoEquals(self.foo_layout, parsed_layout)

    def testNoLayoutFound(self):
        # The bar directory contains no layout.
        ctx = context.RequestContext()
        local_plugin = self.createPlugin(os.path.join(self.logdir, "bar"))
        self.assertDictEqual({}, local_plugin.layout_impl(ctx, "exp_id"))

    def testIsActive(self):
        self.assertFalse(self.plugin.is_active())


if __name__ == "__main__":
    tf.test.main()
