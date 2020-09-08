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
"""Integration tests for the Distributions Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections.abc
import os.path

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard import errors
from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.backend.event_processing import tag_types
from tensorboard.plugins import base_plugin
from tensorboard.plugins.distribution import compressor
from tensorboard.plugins.distribution import distributions_plugin
from tensorboard.plugins.histogram import summary
from tensorboard.util import test_util

tf.compat.v1.disable_v2_behavior()


class DistributionsPluginTest(tf.test.TestCase):

    _STEPS = 99

    _LEGACY_DISTRIBUTION_TAG = "my-ancient-distribution"
    _DISTRIBUTION_TAG = "my-favorite-distribution"
    _SCALAR_TAG = "my-boring-scalars"

    _DISPLAY_NAME = "Very important production statistics"
    _DESCRIPTION = "quod *erat* dispertiendum"
    _HTML_DESCRIPTION = "<p>quod <em>erat</em> dispertiendum</p>"

    _RUN_WITH_LEGACY_DISTRIBUTION = "_RUN_WITH_LEGACY_DISTRIBUTION"
    _RUN_WITH_DISTRIBUTION = "_RUN_WITH_DISTRIBUTION"
    _RUN_WITH_SCALARS = "_RUN_WITH_SCALARS"

    def __init__(self, *args, **kwargs):
        super(DistributionsPluginTest, self).__init__(*args, **kwargs)
        self.logdir = None
        self.plugin = None

    def set_up_with_runs(self, run_names):
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
        context = base_plugin.TBContext(logdir=logdir, data_provider=provider)
        self.plugin = distributions_plugin.DistributionsPlugin(context)

    def generate_run(self, logdir, run_name):
        tf.compat.v1.reset_default_graph()
        sess = tf.compat.v1.Session()
        placeholder = tf.compat.v1.placeholder(tf.float32, shape=[3])

        if run_name == self._RUN_WITH_LEGACY_DISTRIBUTION:
            tf.compat.v1.summary.histogram(
                self._LEGACY_DISTRIBUTION_TAG, placeholder
            )
        elif run_name == self._RUN_WITH_DISTRIBUTION:
            summary.op(
                self._DISTRIBUTION_TAG,
                placeholder,
                display_name=self._DISPLAY_NAME,
                description=self._DESCRIPTION,
            )
        elif run_name == self._RUN_WITH_SCALARS:
            tf.compat.v1.summary.scalar(
                self._SCALAR_TAG, tf.reduce_mean(input_tensor=placeholder)
            )
        else:
            assert False, "Invalid run name: %r" % run_name
        summ = tf.compat.v1.summary.merge_all()

        subdir = os.path.join(logdir, run_name)
        with test_util.FileWriterCache.get(subdir) as writer:
            writer.add_graph(sess.graph)
            for step in xrange(self._STEPS):
                feed_dict = {placeholder: [1 + step, 2 + step, 3 + step]}
                s = sess.run(summ, feed_dict=feed_dict)
                writer.add_summary(s, global_step=step)

    def test_routes_provided(self):
        """Tests that the plugin offers the correct routes."""
        self.set_up_with_runs([self._RUN_WITH_SCALARS])
        routes = self.plugin.get_plugin_apps()
        self.assertIsInstance(
            routes["/distributions"], collections.abc.Callable
        )
        self.assertIsInstance(routes["/tags"], collections.abc.Callable)

    def test_index(self):
        self.set_up_with_runs(
            [
                self._RUN_WITH_SCALARS,
                self._RUN_WITH_LEGACY_DISTRIBUTION,
                self._RUN_WITH_DISTRIBUTION,
            ]
        )
        self.assertEqual(
            {
                # _RUN_WITH_SCALARS omitted: No distribution data.
                self._RUN_WITH_LEGACY_DISTRIBUTION: {
                    self._LEGACY_DISTRIBUTION_TAG: {
                        "displayName": self._LEGACY_DISTRIBUTION_TAG,
                        "description": "",
                    },
                },
                self._RUN_WITH_DISTRIBUTION: {
                    "%s/histogram_summary"
                    % self._DISTRIBUTION_TAG: {
                        "displayName": self._DISPLAY_NAME,
                        "description": self._HTML_DESCRIPTION,
                    },
                },
            },
            self.plugin.index_impl(context.RequestContext(), experiment="exp"),
        )

    def _test_distributions(self, run_name, tag_name, should_work=True):
        self.set_up_with_runs(
            [
                self._RUN_WITH_SCALARS,
                self._RUN_WITH_LEGACY_DISTRIBUTION,
                self._RUN_WITH_DISTRIBUTION,
            ]
        )
        if should_work:
            (data, mime_type) = self.plugin.distributions_impl(
                context.RequestContext(), tag_name, run_name, experiment="exp"
            )
            self.assertEqual("application/json", mime_type)
            self.assertEqual(len(data), self._STEPS)
            for i in xrange(self._STEPS):
                [_unused_wall_time, step, bps_and_icdfs] = data[i]
                self.assertEqual(i, step)
                (bps, _unused_icdfs) = zip(*bps_and_icdfs)
                self.assertEqual(bps, compressor.NORMAL_HISTOGRAM_BPS)
        else:
            with self.assertRaises(errors.NotFoundError):
                self.plugin.distributions_impl(
                    context.RequestContext(),
                    self._DISTRIBUTION_TAG,
                    run_name,
                    experiment="exp",
                )

    def test_distributions_with_scalars(self):
        self._test_distributions(
            self._RUN_WITH_SCALARS, self._DISTRIBUTION_TAG, should_work=False
        )

    def test_distributions_with_legacy_distribution(self):
        self._test_distributions(
            self._RUN_WITH_LEGACY_DISTRIBUTION, self._LEGACY_DISTRIBUTION_TAG
        )

    def test_distributions_with_distribution(self):
        self._test_distributions(
            self._RUN_WITH_DISTRIBUTION,
            "%s/histogram_summary" % self._DISTRIBUTION_TAG,
        )


if __name__ == "__main__":
    tf.test.main()
