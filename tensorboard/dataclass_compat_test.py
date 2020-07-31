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
"""Tests for `tensorboard.dataclass_compat`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import numpy as np
import tensorflow as tf


from tensorboard import dataclass_compat
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.audio import metadata as audio_metadata
from tensorboard.plugins.audio import summary as audio_summary
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.histogram import metadata as histogram_metadata
from tensorboard.plugins.histogram import summary as histogram_summary
from tensorboard.plugins.hparams import metadata as hparams_metadata
from tensorboard.plugins.hparams import summary_v2 as hparams_summary
from tensorboard.plugins.pr_curve import metadata as pr_curve_metadata
from tensorboard.plugins.pr_curve import summary as pr_curve_summary
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.plugins.scalar import summary as scalar_summary
from tensorboard.util import tensor_util
from tensorboard.util import test_util

tf.compat.v1.enable_eager_execution()


class MigrateEventTest(tf.test.TestCase):
    """Tests for `migrate_event`."""

    def _migrate_event(self, old_event, initial_metadata=None):
        """Like `migrate_event`, but performs some sanity checks."""
        if initial_metadata is None:
            initial_metadata = {}
        old_event_copy = event_pb2.Event()
        old_event_copy.CopyFrom(old_event)
        new_events = dataclass_compat.migrate_event(
            old_event, initial_metadata=initial_metadata
        )
        for event in new_events:  # ensure that wall time and step are preserved
            self.assertEqual(event.wall_time, old_event.wall_time)
            self.assertEqual(event.step, old_event.step)
        return new_events

    def test_irrelevant_event_passes_through(self):
        old_event = event_pb2.Event()
        old_event.file_version = "brain.Event:wow"

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertIs(new_events[0], old_event)

    def test_unknown_summary_passes_through(self):
        old_event = event_pb2.Event()
        value = old_event.summary.value.add()
        value.metadata.plugin_data.plugin_name = "magic"
        value.metadata.plugin_data.content = b"123"
        value.tensor.CopyFrom(tensor_util.make_tensor_proto([1, 2]))

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertIs(new_events[0], old_event)

    def test_already_newstyle_summary_passes_through(self):
        # ...even when it's from a known plugin and would otherwise be migrated.
        old_event = event_pb2.Event()
        old_event.summary.ParseFromString(
            scalar_summary.pb(
                "foo", 1.25, display_name="bar", description="baz"
            ).SerializeToString()
        )
        metadata = old_event.summary.value[0].metadata
        metadata.data_class = summary_pb2.DATA_CLASS_TENSOR  # note: not scalar

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertIs(new_events[0], old_event)

    def test_doesnt_add_metadata_to_later_steps(self):
        old_events = []
        for step in range(3):
            e = event_pb2.Event()
            e.step = step
            summary = scalar_summary.pb("foo", 0.125)
            if step > 0:
                for v in summary.value:
                    v.ClearField("metadata")
            e.summary.ParseFromString(summary.SerializeToString())
            old_events.append(e)

        initial_metadata = {}
        new_events = []
        for e in old_events:
            migrated = self._migrate_event(e, initial_metadata=initial_metadata)
            new_events.extend(migrated)

        self.assertLen(new_events, len(old_events))
        self.assertEqual(
            {
                e.step
                for e in new_events
                for v in e.summary.value
                if v.HasField("metadata")
            },
            {0},
        )

    def test_scalar(self):
        old_event = event_pb2.Event()
        old_event.step = 123
        old_event.wall_time = 456.75
        old_event.summary.ParseFromString(
            scalar_summary.pb(
                "foo", 1.25, display_name="bar", description="baz"
            ).SerializeToString()
        )

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertLen(new_events[0].summary.value, 1)
        value = new_events[0].summary.value[0]
        tensor = tensor_util.make_ndarray(value.tensor)
        self.assertEqual(tensor.shape, ())
        self.assertEqual(tensor.item(), 1.25)
        self.assertEqual(
            value.metadata.data_class, summary_pb2.DATA_CLASS_SCALAR
        )
        self.assertEqual(
            value.metadata.plugin_data.plugin_name, scalar_metadata.PLUGIN_NAME
        )

    def test_histogram(self):
        old_event = event_pb2.Event()
        old_event.step = 123
        old_event.wall_time = 456.75
        histogram_pb = histogram_summary.pb(
            "foo",
            [1.0, 2.0, 3.0, 4.0],
            bucket_count=12,
            display_name="bar",
            description="baz",
        )
        old_event.summary.ParseFromString(histogram_pb.SerializeToString())

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertLen(new_events[0].summary.value, 1)
        value = new_events[0].summary.value[0]
        tensor = tensor_util.make_ndarray(value.tensor)
        self.assertEqual(tensor.shape, (12, 3))
        np.testing.assert_array_equal(
            tensor, tensor_util.make_ndarray(histogram_pb.value[0].tensor)
        )
        self.assertEqual(
            value.metadata.data_class, summary_pb2.DATA_CLASS_TENSOR
        )
        self.assertEqual(
            value.metadata.plugin_data.plugin_name,
            histogram_metadata.PLUGIN_NAME,
        )

    def test_audio(self):
        logdir = self.get_temp_dir()
        steps = (0, 1, 2)
        with test_util.FileWriter(logdir) as writer:
            for step in steps:
                event = event_pb2.Event()
                event.step = step
                event.wall_time = 456.75 * step
                audio = tf.reshape(
                    tf.linspace(0.0, 100.0, 4 * 10 * 2), (4, 10, 2)
                )
                audio_pb = audio_summary.pb(
                    "foo",
                    audio,
                    labels=["one", "two", "three", "four"],
                    sample_rate=44100,
                    display_name="bar",
                    description="baz",
                )
                writer.add_summary(
                    audio_pb.SerializeToString(), global_step=step
                )
        files = os.listdir(logdir)
        self.assertLen(files, 1)
        event_file = os.path.join(logdir, files[0])
        loader = event_file_loader.RawEventFileLoader(event_file)
        input_events = [event_pb2.Event.FromString(x) for x in loader.Load()]

        new_events = []
        initial_metadata = {}
        for input_event in input_events:
            migrated = self._migrate_event(
                input_event, initial_metadata=initial_metadata
            )
            new_events.extend(migrated)

        self.assertLen(new_events, 4)
        self.assertEqual(new_events[0].WhichOneof("what"), "file_version")
        for step in steps:
            with self.subTest("step %d" % step):
                new_event = new_events[step + 1]
                self.assertLen(new_event.summary.value, 1)
                value = new_event.summary.value[0]
                tensor = tensor_util.make_ndarray(value.tensor)
                self.assertEqual(
                    tensor.shape, (3,)
                )  # 4 clipped to max_outputs=3
                self.assertStartsWith(tensor[0], b"RIFF")
                self.assertStartsWith(tensor[1], b"RIFF")
                if step == min(steps):
                    metadata = value.metadata
                    self.assertEqual(
                        metadata.data_class,
                        summary_pb2.DATA_CLASS_BLOB_SEQUENCE,
                    )
                    self.assertEqual(
                        metadata.plugin_data.plugin_name,
                        audio_metadata.PLUGIN_NAME,
                    )
                else:
                    self.assertFalse(value.HasField("metadata"))

    def test_hparams(self):
        old_event = event_pb2.Event()
        old_event.step = 0
        old_event.wall_time = 456.75
        hparams_pb = hparams_summary.hparams_pb({"optimizer": "adam"})
        # Simulate legacy event with no tensor content
        for v in hparams_pb.value:
            v.ClearField("tensor")
        old_event.summary.CopyFrom(hparams_pb)

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertLen(new_events[0].summary.value, 1)
        value = new_events[0].summary.value[0]
        self.assertEqual(value.tensor, hparams_metadata.NULL_TENSOR)
        self.assertEqual(
            value.metadata.data_class, summary_pb2.DATA_CLASS_TENSOR
        )
        self.assertEqual(
            value.metadata.plugin_data,
            hparams_pb.value[0].metadata.plugin_data,
        )

    def test_pr_curves(self):
        old_event = event_pb2.Event()
        old_event.step = 123
        old_event.wall_time = 456.75
        pr_curve_pb = pr_curve_summary.pb(
            "foo",
            labels=np.array([True, False, True, False]),
            predictions=np.array([0.75, 0.25, 0.85, 0.15]),
            num_thresholds=10,
            display_name="bar",
            description="baz",
        )
        old_event.summary.ParseFromString(pr_curve_pb.SerializeToString())

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 1)
        self.assertLen(new_events[0].summary.value, 1)
        value = new_events[0].summary.value[0]
        tensor = tensor_util.make_ndarray(value.tensor)
        self.assertEqual(tensor.shape, (6, 10))
        np.testing.assert_array_equal(
            tensor, tensor_util.make_ndarray(pr_curve_pb.value[0].tensor)
        )
        self.assertEqual(
            value.metadata.data_class, summary_pb2.DATA_CLASS_TENSOR
        )
        self.assertEqual(
            value.metadata.plugin_data.plugin_name,
            pr_curve_metadata.PLUGIN_NAME,
        )

    def test_graph_def(self):
        # Create a `GraphDef` and write it to disk as an event.
        logdir = self.get_temp_dir()
        writer = test_util.FileWriter(logdir)
        graph_def = graph_pb2.GraphDef()
        graph_def.node.add(name="alice", op="Person")
        graph_def.node.add(name="bob", op="Person")
        graph_def.node.add(
            name="friendship", op="Friendship", input=["alice", "bob"]
        )
        writer.add_graph(graph=None, graph_def=graph_def, global_step=123)
        writer.flush()

        # Read in the `Event` containing the written `graph_def`.
        files = os.listdir(logdir)
        self.assertLen(files, 1)
        event_file = os.path.join(logdir, files[0])
        self.assertIn("tfevents", event_file)
        loader = event_file_loader.RawEventFileLoader(event_file)
        events = [event_pb2.Event.FromString(x) for x in loader.Load()]
        self.assertLen(events, 2)
        self.assertEqual(events[0].WhichOneof("what"), "file_version")
        self.assertEqual(events[1].WhichOneof("what"), "graph_def")
        old_event = events[1]

        new_events = self._migrate_event(old_event)
        self.assertLen(new_events, 2)
        self.assertIs(new_events[0], old_event)
        new_event = new_events[1]

        self.assertEqual(new_event.WhichOneof("what"), "summary")
        self.assertLen(new_event.summary.value, 1)
        tensor = tensor_util.make_ndarray(new_event.summary.value[0].tensor)
        self.assertEqual(
            new_event.summary.value[0].metadata.data_class,
            summary_pb2.DATA_CLASS_BLOB_SEQUENCE,
        )
        self.assertEqual(
            new_event.summary.value[0].metadata.plugin_data.plugin_name,
            graphs_metadata.PLUGIN_NAME,
        )
        self.assertEqual(tensor.shape, (1,))
        new_graph_def_bytes = tensor[0]
        self.assertIsInstance(new_graph_def_bytes, bytes)
        self.assertGreaterEqual(len(new_graph_def_bytes), 16)
        new_graph_def = graph_pb2.GraphDef.FromString(new_graph_def_bytes)

        self.assertProtoEquals(graph_def, new_graph_def)


if __name__ == "__main__":
    tf.test.main()
