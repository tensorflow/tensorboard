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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import collections.abc
import csv
import functools
import os.path
import unittest

from six import StringIO
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard import errors
from tensorboard.backend import application
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.backend.event_processing import tag_types
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.plugins.scalar import metadata
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
    _RUN_WITH_HISTOGRAM = "_RUN_WITH_HISTOGRAM"

    def load_runs(self, run_names):
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
        return (logdir, multiplexer)

    def with_runs(run_names):
        """Run a test with a bare multiplexer and with a `data_provider`.

        The decorated function will receive an initialized
        `ScalarsPlugin` object as its first positional argument.
        """

        def decorator(fn):
            @functools.wraps(fn)
            def wrapper(self, *args, **kwargs):
                (logdir, multiplexer) = self.load_runs(run_names)
                with self.subTest("bare multiplexer"):
                    ctx = base_plugin.TBContext(
                        logdir=logdir,
                        multiplexer=multiplexer,
                        flags=argparse.Namespace(generic_data="false"),
                    )
                    fn(self, scalars_plugin.ScalarsPlugin(ctx), *args, **kwargs)
                with self.subTest("generic data provider"):
                    flags = argparse.Namespace(generic_data="true")
                    provider = data_provider.MultiplexerDataProvider(
                        multiplexer, logdir
                    )
                    ctx = base_plugin.TBContext(
                        flags=flags,
                        logdir=logdir,
                        multiplexer=multiplexer,
                        data_provider=provider,
                    )
                    fn(self, scalars_plugin.ScalarsPlugin(ctx), *args, **kwargs)

            return wrapper

        return decorator

    def generate_run(self, logdir, run_name):
        subdir = os.path.join(logdir, run_name)
        with test_util.FileWriterCache.get(subdir) as writer:
            for step in xrange(self._STEPS):
                data = [1 + step, 2 + step, 3 + step]
                if run_name == self._RUN_WITH_LEGACY_SCALARS:
                    summ = tf.compat.v1.summary.scalar(
                        self._LEGACY_SCALAR_TAG, tf.reduce_mean(data),
                    ).numpy()
                elif run_name == self._RUN_WITH_SCALARS:
                    summ = summary.op(
                        self._SCALAR_TAG,
                        tf.reduce_sum(data),
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

    @with_runs([])
    def testRoutesProvided(self, plugin):
        """Tests that the plugin offers the correct routes."""
        routes = plugin.get_plugin_apps()
        self.assertIsInstance(routes["/scalars"], collections.abc.Callable)
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)

    @with_runs(
        [_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM]
    )
    def test_index(self, plugin):
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
            plugin.index_impl("eid"),
        )

    @with_runs(
        [_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM]
    )
    def _test_scalars_json(self, plugin, run_name, tag_name, should_work=True):
        if should_work:
            (data, mime_type) = plugin.scalars_impl(
                tag_name, run_name, "eid", scalars_plugin.OutputFormat.JSON
            )
            self.assertEqual("application/json", mime_type)
            self.assertEqual(len(data), self._STEPS)
        else:
            with self.assertRaises(errors.NotFoundError):
                plugin.scalars_impl(
                    self._SCALAR_TAG,
                    run_name,
                    "eid",
                    scalars_plugin.OutputFormat.JSON,
                )

    @with_runs(
        [_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM]
    )
    def _test_scalars_csv(self, plugin, run_name, tag_name, should_work=True):
        if should_work:
            (data, mime_type) = plugin.scalars_impl(
                tag_name, run_name, "eid", scalars_plugin.OutputFormat.CSV
            )
            self.assertEqual("text/csv", mime_type)
            s = StringIO(data)
            reader = csv.reader(s)
            self.assertEqual(["Wall time", "Step", "Value"], next(reader))
            self.assertEqual(len(list(reader)), self._STEPS)
        else:
            with self.assertRaises(errors.NotFoundError):
                plugin.scalars_impl(
                    self._SCALAR_TAG,
                    run_name,
                    "eid",
                    scalars_plugin.OutputFormat.CSV,
                )

    def test_scalars_json_with_legacy_scalars(self):
        self._test_scalars_json(
            self._RUN_WITH_LEGACY_SCALARS, self._LEGACY_SCALAR_TAG
        )

    def test_scalars_json_with_scalars(self):
        self._test_scalars_json(
            self._RUN_WITH_SCALARS, "%s/scalar_summary" % self._SCALAR_TAG
        )

    def test_scalars_json_with_histogram(self):
        self._test_scalars_json(
            self._RUN_WITH_HISTOGRAM, self._HISTOGRAM_TAG, should_work=False
        )

    def test_scalars_csv_with_legacy_scalars(self):
        self._test_scalars_csv(
            self._RUN_WITH_LEGACY_SCALARS, self._LEGACY_SCALAR_TAG
        )

    def test_scalars_csv_with_scalars(self):
        self._test_scalars_csv(
            self._RUN_WITH_SCALARS, "%s/scalar_summary" % self._SCALAR_TAG
        )

    def test_scalars_csv_with_histogram(self):
        self._test_scalars_csv(
            self._RUN_WITH_HISTOGRAM, self._HISTOGRAM_TAG, should_work=False
        )

    @with_runs([_RUN_WITH_LEGACY_SCALARS])
    def test_active_with_legacy_scalars(self, plugin):
        if plugin._data_provider:
            self.assertFalse(plugin.is_active())
        else:
            self.assertTrue(plugin.is_active())

    @with_runs([_RUN_WITH_SCALARS])
    def test_active_with_scalars(self, plugin):
        if plugin._data_provider:
            self.assertFalse(plugin.is_active())
        else:
            self.assertTrue(plugin.is_active())

    @with_runs([_RUN_WITH_HISTOGRAM])
    def test_active_with_histogram(self, plugin):
        self.assertFalse(plugin.is_active())

    @with_runs(
        [_RUN_WITH_LEGACY_SCALARS, _RUN_WITH_SCALARS, _RUN_WITH_HISTOGRAM]
    )
    def test_active_with_all(self, plugin):
        if plugin._data_provider:
            self.assertFalse(plugin.is_active())
        else:
            self.assertTrue(plugin.is_active())


if __name__ == "__main__":
    tf.test.main()
