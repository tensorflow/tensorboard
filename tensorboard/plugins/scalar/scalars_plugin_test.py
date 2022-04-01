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
"""Integration tests for the Scalars Plugin."""


import csv
import io
import json
import os.path

import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.backend.event_processing import tag_types
from tensorboard.plugins import base_plugin
from tensorboard.plugins.scalar import scalars_plugin
from tensorboard.plugins.scalar import summary
from tensorboard.util import test_util


tf.compat.v1.enable_eager_execution()


class ScalarsPluginTest(tf.test.TestCase):

    _STEPS = 9

    _LEGACY_SCALAR_TAG = "ancient-values"
    _SCALAR_TAG = "simple-values"
    _HISTOGRAM_TAG = "complicated-values"

    _DISPLAY_NAME = "Walrus population"
    _DESCRIPTION = "the *most* valuable statistic"
    _HTML_DESCRIPTION = "<p>the <em>most</em> valuable statistic</p>"

    _RUN_WITH_LEGACY_SCALARS = "_RUN_WITH_LEGACY_SCALARS"
    _RUN_WITH_SCALARS = "_RUN_WITH_SCALARS"
    _RUN_WITH_SCALARS_2 = "_RUN_WITH_SCALARS_2"
    _RUN_WITH_SCALARS_3 = "_RUN_WITH_SCALARS_3"
    _RUN_WITH_HISTOGRAM = "_RUN_WITH_HISTOGRAM"

    def load_plugin(self, run_names):
        logdir = self.get_temp_dir()
        for run_name in run_names:
            self.generate_run(logdir, run_name)
        multiplexer = event_multiplexer.EventMultiplexer(
            size_guidance={
                # don't truncate my test data, please
                tag_types.TENSORS: self._STEPS,
            }
        )
        multiplexer.AddRunsFromDirectory(logdir)
        multiplexer.Reload()

        provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
        ctx = base_plugin.TBContext(
            logdir=logdir,
            data_provider=provider,
        )
        return scalars_plugin.ScalarsPlugin(ctx)

    def load_server(self, run_names):
        plugin = self.load_plugin(run_names)
        wsgi_app = application.TensorBoardWSGI([plugin])
        server = werkzeug_test.Client(wsgi_app, wrappers.Response)
        return server

    def generate_run(self, logdir, run_name):
        subdir = os.path.join(logdir, run_name)
        with test_util.FileWriterCache.get(subdir) as writer:
            for step in range(self._STEPS):
                data = [1 + step, 2 + step, 3 + step]
                if run_name == self._RUN_WITH_LEGACY_SCALARS:
                    summ = tf.compat.v1.summary.scalar(
                        self._LEGACY_SCALAR_TAG,
                        tf.reduce_mean(data),
                    ).numpy()
                elif run_name == self._RUN_WITH_SCALARS:
                    summ = summary.op(
                        self._SCALAR_TAG,
                        tf.reduce_sum(data),
                        display_name=self._DISPLAY_NAME,
                        description=self._DESCRIPTION,
                    ).numpy()
                elif run_name == self._RUN_WITH_SCALARS_2:
                    summ = summary.op(
                        self._SCALAR_TAG,
                        2 * tf.reduce_sum(data),
                        display_name=self._DISPLAY_NAME,
                        description=self._DESCRIPTION,
                    ).numpy()
                elif run_name == self._RUN_WITH_SCALARS_3:
                    summ = summary.op(
                        self._SCALAR_TAG,
                        3 * tf.reduce_sum(data),
                        display_name=self._DISPLAY_NAME,
                        description=self._DESCRIPTION,
                    ).numpy()
                elif run_name == self._RUN_WITH_HISTOGRAM:
                    summ = tf.compat.v1.summary.histogram(
                        self._HISTOGRAM_TAG, data
                    ).numpy()
                else:
                    assert False, "Invalid run name: %r" % run_name
                writer.add_summary(summ, global_step=step)

    def test_index(self):
        server = self.load_server(
            [
                self._RUN_WITH_LEGACY_SCALARS,
                self._RUN_WITH_SCALARS,
                self._RUN_WITH_HISTOGRAM,
            ]
        )
        response = server.get("/data/plugin/scalars/tags")
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        self.assertEqual(
            {
                self._RUN_WITH_LEGACY_SCALARS: {
                    self._LEGACY_SCALAR_TAG: {
                        "displayName": self._LEGACY_SCALAR_TAG,
                        "description": "",
                    },
                },
                self._RUN_WITH_SCALARS: {
                    "%s/scalar_summary"
                    % self._SCALAR_TAG: {
                        "displayName": self._DISPLAY_NAME,
                        "description": self._HTML_DESCRIPTION,
                    },
                },
                # _RUN_WITH_HISTOGRAM omitted: No scalar data.
            },
            json.loads(response.get_data()),
        )

    def test_scalars_with_legacy_scalars(self):
        server = self.load_server([self._RUN_WITH_LEGACY_SCALARS])
        response = server.get(
            "/data/plugin/scalars/scalars",
            query_string={
                "run": self._RUN_WITH_LEGACY_SCALARS,
                "tag": self._LEGACY_SCALAR_TAG,
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        self.assertEqual(self._STEPS, len(json.loads(response.get_data())))

    def test_scalars_with_scalars(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.get(
            "/data/plugin/scalars/scalars",
            query_string={
                "run": self._RUN_WITH_SCALARS,
                "tag": "%s/scalar_summary" % self._SCALAR_TAG,
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        self.assertEqual(self._STEPS, len(json.loads(response.get_data())))

    def test_scalars_with_scalars_unspecified_run(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.get(
            "/data/plugin/scalars/scalars",
            query_string={"run": None, "tag": "foo_tag"},
        )
        self.assertEqual(400, response.status_code)

    def test_scalars_with_scalars_unspecified_tag(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.get(
            "/data/plugin/scalars/scalars",
            query_string={"run": "foo_run", "tag": None},
        )
        self.assertEqual(400, response.status_code)

    def test_scalars_with_histogram(self):
        server = self.load_server([self._RUN_WITH_HISTOGRAM])
        response = server.get(
            "/data/plugin/scalars/scalars",
            query_string={
                "run": self._RUN_WITH_HISTOGRAM,
                "tag": "%s/scalar_summary" % self._HISTOGRAM_TAG,
            },
        )
        self.assertEqual(404, response.status_code)

    def test_scalars_multirun(self):
        server = self.load_server(
            [
                self._RUN_WITH_SCALARS,
                self._RUN_WITH_SCALARS_2,
                self._RUN_WITH_SCALARS_3,
            ]
        )
        response = server.post(
            "/data/plugin/scalars/scalars_multirun",
            data={
                "tag": "%s/scalar_summary" % self._SCALAR_TAG,
                "runs": [
                    self._RUN_WITH_SCALARS,
                    # skip _RUN_WITH_SCALARS_2
                    self._RUN_WITH_SCALARS_3,
                    self._RUN_WITH_HISTOGRAM,  # no data for this tag; okay
                    "nonexistent_run",  # no data at all; okay
                ],
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        data = json.loads(response.get_data())
        self.assertCountEqual(
            [self._RUN_WITH_SCALARS, self._RUN_WITH_SCALARS_3], data
        )
        self.assertLen(data[self._RUN_WITH_SCALARS], self._STEPS)
        self.assertLen(data[self._RUN_WITH_SCALARS_3], self._STEPS)
        self.assertNotEqual(
            data[self._RUN_WITH_SCALARS][0][2],
            data[self._RUN_WITH_SCALARS_3][0][2],
        )

    def test_scalars_multirun_single_run(self):
        # Checks for any problems with singleton arrays.
        server = self.load_server(
            [
                self._RUN_WITH_SCALARS,
                self._RUN_WITH_SCALARS_2,
                self._RUN_WITH_SCALARS_3,
            ]
        )
        response = server.post(
            "/data/plugin/scalars/scalars_multirun",
            data={
                "tag": "%s/scalar_summary" % self._SCALAR_TAG,
                "runs": [self._RUN_WITH_SCALARS],
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        data = json.loads(response.get_data())
        self.assertCountEqual([self._RUN_WITH_SCALARS], data)
        self.assertLen(data[self._RUN_WITH_SCALARS], self._STEPS)

    def test_scalars_multirun_no_runs(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.post(
            "/data/plugin/scalars/scalars_multirun",
            data={"tag": "%s/scalar_summary" % self._SCALAR_TAG},
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        data = json.loads(response.get_data())
        self.assertEqual({}, data)

    def test_scalars_multirun_no_tag(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.post(
            "/data/plugin/scalars/scalars_multirun",
            data={"runs": [self._RUN_WITH_SCALARS, self._RUN_WITH_SCALARS_2]},
        )
        self.assertEqual(400, response.status_code)
        self.assertIn(
            "tag must be specified", response.get_data().decode("utf-8")
        )

    def test_scalars_multirun_two_tags(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.post(
            "/data/plugin/scalars/scalars_multirun",
            data={
                "tag": ["accuracy", "loss"],
                "runs": [self._RUN_WITH_SCALARS, self._RUN_WITH_SCALARS_2],
            },
        )
        self.assertEqual(400, response.status_code)
        self.assertIn("exactly once", response.get_data().decode("utf-8"))

    def test_scalars_multirun_bad_method(self):
        server = self.load_server([self._RUN_WITH_SCALARS])
        response = server.get(
            "/data/plugin/scalars/scalars_multirun",
            query_string={
                "tag": "%s/scalar_summary" % self._SCALAR_TAG,
                "runs": [
                    self._RUN_WITH_SCALARS,
                    self._RUN_WITH_SCALARS_3,
                ],
            },
        )
        self.assertEqual(405, response.status_code)
        self.assertEqual(response.headers["Allow"], "POST")

    def test_active_with_legacy_scalars(self):
        plugin = self.load_plugin([self._RUN_WITH_LEGACY_SCALARS])
        self.assertFalse(plugin.is_active())

    def test_active_with_scalars(self):
        plugin = self.load_plugin([self._RUN_WITH_SCALARS])
        self.assertFalse(plugin.is_active())

    def test_active_with_histogram(self):
        plugin = self.load_plugin([self._RUN_WITH_HISTOGRAM])
        self.assertFalse(plugin.is_active())

    def test_active_with_all(self):
        plugin = self.load_plugin(
            [
                self._RUN_WITH_LEGACY_SCALARS,
                self._RUN_WITH_SCALARS,
                self._RUN_WITH_HISTOGRAM,
            ]
        )
        self.assertFalse(plugin.is_active())

    def test_download_url_json(self):
        plugin = self.load_plugin([self._RUN_WITH_SCALARS])
        wsgi_app = application.TensorBoardWSGI([plugin])
        server = werkzeug_test.Client(wsgi_app, wrappers.Response)
        response = server.get(
            "/data/plugin/scalars/scalars?run=%s&tag=%s"
            % (
                self._RUN_WITH_SCALARS,
                "%s/scalar_summary" % self._SCALAR_TAG,
            )
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.headers["Content-Type"])
        payload = json.loads(response.get_data())
        self.assertEqual(len(payload), self._STEPS)

    def test_download_url_csv(self):
        plugin = self.load_plugin([self._RUN_WITH_SCALARS])
        wsgi_app = application.TensorBoardWSGI([plugin])
        server = werkzeug_test.Client(wsgi_app, wrappers.Response)
        response = server.get(
            "/data/plugin/scalars/scalars?run=%s&tag=%s&format=csv"
            % (
                self._RUN_WITH_SCALARS,
                "%s/scalar_summary" % self._SCALAR_TAG,
            )
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "text/csv; charset=utf-8", response.headers["Content-Type"]
        )
        payload = response.get_data()
        s = io.StringIO(payload.decode("utf-8"))
        reader = csv.reader(s)
        self.assertEqual(["Wall time", "Step", "Value"], next(reader))
        self.assertEqual(len(list(reader)), self._STEPS)


if __name__ == "__main__":
    tf.test.main()
