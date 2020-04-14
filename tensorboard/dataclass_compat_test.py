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

from google.protobuf import message

from tensorboard import dataclass_compat
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import node_def_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.histogram import metadata as histogram_metadata
from tensorboard.plugins.histogram import summary as histogram_summary
from tensorboard.plugins.hparams import metadata as hparams_metadata
from tensorboard.plugins.hparams import summary_v2 as hparams_summary
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.plugins.scalar import summary as scalar_summary
from tensorboard.util import tensor_util
from tensorboard.util import test_util

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import


class MigrateEventTest(tf.test.TestCase):
    """Tests for `migrate_event`."""

    def _migrate_event(self, old_event, experimental_filter_graph=False):
        """Like `migrate_event`, but performs some sanity checks."""
        old_event_copy = event_pb2.Event()
        old_event_copy.CopyFrom(old_event)
        new_events = dataclass_compat.migrate_event(
            old_event, experimental_filter_graph
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
        loader = event_file_loader.EventFileLoader(event_file)
        events = list(loader.Load())
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

    def test_graph_def_experimental_filter_graph(self):
        # Create a `GraphDef`
        graph_def = graph_pb2.GraphDef()
        graph_def.node.add(name="alice", op="Person")
        graph_def.node.add(name="bob", op="Person")

        graph_def.node[1].attr["small"].s = b"small_attr_value"
        graph_def.node[1].attr["large"].s = (
            b"large_attr_value" * 100  # 1600 bytes > 1024 limit
        )
        graph_def.node.add(
            name="friendship", op="Friendship", input=["alice", "bob"]
        )

        # Simulate legacy graph event
        old_event = event_pb2.Event()
        old_event.step = 0
        old_event.wall_time = 456.75
        old_event.graph_def = graph_def.SerializeToString()

        new_events = self._migrate_event(
            old_event, experimental_filter_graph=True
        )

        new_event = new_events[1]
        tensor = tensor_util.make_ndarray(new_event.summary.value[0].tensor)
        new_graph_def_bytes = tensor[0]
        new_graph_def = graph_pb2.GraphDef.FromString(new_graph_def_bytes)

        expected_graph_def = graph_pb2.GraphDef()
        expected_graph_def.CopyFrom(graph_def)
        del expected_graph_def.node[1].attr["large"]
        expected_graph_def.node[1].attr["_too_large_attrs"].list.s.append(
            b"large"
        )

        self.assertProtoEquals(expected_graph_def, new_graph_def)

    def test_graph_def_experimental_filter_graph_corrupt(self):
        # Simulate legacy graph event with an unparseable graph.
        # We can't be sure whether this will produce `DecodeError` or
        # `RuntimeWarning`, so we also check both cases below.
        old_event = event_pb2.Event()
        old_event.step = 0
        old_event.wall_time = 456.75
        # Careful: some proto parsers choke on byte arrays filled with 0, but
        # others don't (silently producing an empty proto, I guess).
        # Thus `old_event.graph_def = bytes(1024)` is an unreliable example.
        old_event.graph_def = b"<malformed>"

        new_events = self._migrate_event(
            old_event, experimental_filter_graph=True
        )
        # _migrate_event emits both the original event and the migrated event,
        # but here there is no migrated event becasue the graph was unparseable.
        self.assertLen(new_events, 1)
        self.assertProtoEquals(new_events[0], old_event)

    def test_graph_def_experimental_filter_graph_DecodeError(self):
        # Simulate raising DecodeError when parsing a graph event
        old_event = event_pb2.Event()
        old_event.step = 0
        old_event.wall_time = 456.75
        old_event.graph_def = b"<malformed>"

        with mock.patch(
            "tensorboard.compat.proto.graph_pb2.GraphDef"
        ) as mockGraphDef:
            instance = mockGraphDef.return_value
            instance.FromString.side_effect = message.DecodeError

            new_events = self._migrate_event(
                old_event, experimental_filter_graph=True
            )

        # _migrate_event emits both the original event and the migrated event,
        # but here there is no migrated event becasue the graph was unparseable.
        self.assertLen(new_events, 1)
        self.assertProtoEquals(new_events[0], old_event)

    def test_graph_def_experimental_filter_graph_RuntimeWarning(self):
        # Simulate raising RuntimeWarning when parsing a graph event
        old_event = event_pb2.Event()
        old_event.step = 0
        old_event.wall_time = 456.75
        old_event.graph_def = b"<malformed>"

        with mock.patch(
            "tensorboard.compat.proto.graph_pb2.GraphDef"
        ) as mockGraphDef:
            instance = mockGraphDef.return_value
            instance.FromString.side_effect = RuntimeWarning

            new_events = self._migrate_event(
                old_event, experimental_filter_graph=True
            )

        # _migrate_event emits both the original event and the migrated event,
        # but here there is no migrated event becasue the graph was unparseable.
        self.assertLen(new_events, 1)
        self.assertProtoEquals(new_events[0], old_event)

    def test_graph_def_experimental_filter_graph_empty(self):
        # Simulate legacy graph event with an empty graph
        old_event = event_pb2.Event()
        old_event.step = 0
        old_event.wall_time = 456.75
        old_event.graph_def = b""

        new_events = self._migrate_event(
            old_event, experimental_filter_graph=True
        )
        # _migrate_event emits both the original event and the migrated event.
        # The migrated event contains a default empty GraphDef.
        self.assertLen(new_events, 2)
        self.assertProtoEquals(new_events[0], old_event)

        # We expect that parsing `b""` as a `GraphDef` produces the default
        # 'empty' proto, just like `graph_pb2.GraphDef()`.  Furthermore, we
        # expect serializing that to produce `b""` again (as opposed to some
        # other representation of the default proto, e.g. one in which default
        # values are materialized).
        # Here we extract the serialized graph_def from the migrated event,
        # which is the result of such a deserialize/serialize cycle, to validate
        # these expectations.
        # This also demonstrates that empty `GraphDefs` are not rejected or
        # ignored.
        new_event = new_events[1]
        tensor = tensor_util.make_ndarray(new_event.summary.value[0].tensor)
        new_graph_def_bytes = tensor[0]
        self.assertEqual(new_graph_def_bytes, b"")


if __name__ == "__main__":
    tf.test.main()
