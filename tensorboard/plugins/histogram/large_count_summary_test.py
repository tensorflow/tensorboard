# -*- coding: utf-8 -*-
# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for the histogram plugin summary with large counts."""


import glob
import os

import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.histogram import summary
from tensorboard.util import tensor_util


try:
    tf2.__version__  # Force lazy import to resolve
except ImportError:
    tf2 = None

try:
    tf.compat.v1.enable_eager_execution()
except AttributeError:
    # TF 2.0 doesn't have this symbol because eager is the default.
    pass


class SummaryBaseTest(object):
    def setUp(self):
        super(SummaryBaseTest, self).setUp()

    def histogram(self, *args, **kwargs):
        raise NotImplementedError()

    def test_with_large_counts(self):
        # Check for accumulating floating point errors with large counts (> 2^24).
        # See https://github.com/tensorflow/tensorflow/issues/51419 for details.
        large_count = 20_000_000
        data = [0] + [1] * large_count
        pb = self.histogram("large_count", data=data, buckets=2)
        buckets = tensor_util.make_ndarray(pb.value[0].tensor)
        self.assertEqual(buckets[0][2], 1)
        self.assertEqual(buckets[1][2], large_count)


class SummaryV1PbTest(SummaryBaseTest, tf.test.TestCase):
    def histogram(self, *args, **kwargs):
        # Map new name to the old name.
        if "buckets" in kwargs:
            kwargs["bucket_count"] = kwargs.pop("buckets")
        return summary.pb(*args, **kwargs)


class SummaryV1OpTest(SummaryBaseTest, tf.test.TestCase):
    def histogram(self, *args, **kwargs):
        # Map new name to the old name.
        if "buckets" in kwargs:
            kwargs["bucket_count"] = kwargs.pop("buckets")
        return summary_pb2.Summary.FromString(
            summary.op(*args, **kwargs).numpy()
        )


class SummaryV2PbTest(SummaryBaseTest, tf.test.TestCase):
    def histogram(self, *args, **kwargs):
        return summary.histogram_pb(*args, **kwargs)


class SummaryV3OpTest(SummaryBaseTest, tf.test.TestCase):
    def setUp(self):
        super(SummaryV3OpTest, self).setUp()
        if tf2 is None:
            self.skipTest("v3 histogram summary API not available")

    def histogram(self, *args, **kwargs):
        return self.histogram_event(*args, **kwargs).summary

    def histogram_event(self, *args, **kwargs):
        self.write_histogram_event(*args, **kwargs)
        event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), "*")))
        self.assertEqual(len(event_files), 1)
        events = list(tf.compat.v1.train.summary_iterator(event_files[0]))
        # Expect a boilerplate event for the file_version, then the summary one.
        self.assertEqual(len(events), 2)
        # Delete the event file to reset to an empty directory for later calls.
        # TODO(nickfelt): use a unique subdirectory per writer instead.
        os.remove(event_files[0])
        return events[1]

    def write_histogram_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            self.call_histogram_op(*args, **kwargs)
        writer.close()

    def call_histogram_op(self, *args, **kwargs):
        summary.histogram(*args, **kwargs)


class SummaryV3OpGraphTest(SummaryV3OpTest, tf.test.TestCase):
    def write_histogram_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        # Hack to extract current scope since there's no direct API for it.
        with tf.name_scope("_") as temp_scope:
            scope = temp_scope.rstrip("/_")

        @tf2.function
        def graph_fn():
            # Recreate the active scope inside the defun since it won't propagate.
            with tf.name_scope(scope):
                self.call_histogram_op(*args, **kwargs)

        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            graph_fn()
        writer.close()


if __name__ == "__main__":
    tf.test.main()
