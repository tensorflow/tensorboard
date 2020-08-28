# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for tensorboard.plugins.mesh.summary."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
import json
import os

import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.plugins.mesh import summary
from tensorboard.plugins.mesh import metadata
from tensorboard.plugins.mesh import plugin_data_pb2
from tensorboard.plugins.mesh import test_utils


try:
    tf2.__version__  # Force lazy import to resolve
except ImportError:
    tf2 = None

try:
    tf.compat.v1.enable_eager_execution()
except AttributeError:
    # TF 2.0 doesn't have this symbol because eager is the default.
    pass


class MeshSummaryV2Test(tf.test.TestCase):
    def setUp(self):
        super(MeshSummaryV2Test, self).setUp()
        if tf2 is None:
            self.skipTest("v2 summary API not available")

    def mesh_events(self, *args, **kwargs):
        self.write_mesh_event(*args, **kwargs)
        event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), "*")))
        self.assertEqual(len(event_files), 1)
        events = list(tf.compat.v1.train.summary_iterator(event_files[0]))
        # Expect a boilerplate event for the file_version, then the vertices
        # summary one.
        num_events = 2
        # All additional tensors (i.e. colors or faces) will be stored as separate
        # events, so account for them as well.
        num_events += len(frozenset(["colors", "faces"]).intersection(kwargs))
        self.assertEqual(len(events), num_events)
        # Delete the event file to reset to an empty directory for later calls.
        os.remove(event_files[0])
        return events[1:]

    def write_mesh_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            summary.mesh(*args, **kwargs)
        writer.close()

    def get_metadata(self, event):
        return metadata.parse_plugin_metadata(
            event.summary.value[0].metadata.plugin_data.content
        )

    def test_step(self):
        """Tests that different components of mesh summary share the same
        step."""
        tensor_data = test_utils.get_random_mesh(
            100, add_faces=True, add_colors=True
        )
        config_dict = {"foo": 1}
        events = self.mesh_events(
            "a",
            tensor_data.vertices,
            faces=tensor_data.faces,
            colors=tensor_data.colors,
            config_dict=config_dict,
            step=333,
        )
        self.assertEqual(333, events[0].step)
        self.assertEqual(333, events[1].step)
        self.assertEqual(333, events[2].step)

    def test_tags(self):
        """Tests proper tags for each event/tensor."""
        tensor_data = test_utils.get_random_mesh(
            100, add_faces=True, add_colors=True
        )
        config_dict = {"foo": 1}
        name = "foo"
        events = self.mesh_events(
            name,
            tensor_data.vertices,
            faces=tensor_data.faces,
            colors=tensor_data.colors,
            config_dict=config_dict,
            step=333,
        )
        expected_names_set = frozenset(
            name_tpl % name for name_tpl in ["%s_VERTEX", "%s_FACE", "%s_COLOR"]
        )
        actual_names_set = frozenset(
            [event.summary.value[0].tag for event in events]
        )
        self.assertEqual(expected_names_set, actual_names_set)
        expected_bitmask = metadata.get_components_bitmask(
            [
                plugin_data_pb2.MeshPluginData.VERTEX,
                plugin_data_pb2.MeshPluginData.FACE,
                plugin_data_pb2.MeshPluginData.COLOR,
            ]
        )
        for event in events:
            self.assertEqual(
                expected_bitmask, self.get_metadata(event).components
            )

    def test_pb(self):
        """Tests ProtoBuf interface."""
        name = "my_mesh"
        tensor_data = test_utils.get_random_mesh(
            100, add_faces=True, add_colors=True
        )
        config_dict = {"foo": 1}
        proto = summary.mesh_pb(
            name,
            tensor_data.vertices,
            faces=tensor_data.faces,
            colors=tensor_data.colors,
            config_dict=config_dict,
        )
        plugin_metadata = metadata.parse_plugin_metadata(
            proto.value[0].metadata.plugin_data.content
        )
        self.assertEqual(
            json.dumps(config_dict, sort_keys=True), plugin_metadata.json_config
        )


class MeshSummaryV2GraphTest(MeshSummaryV2Test, tf.test.TestCase):
    def write_mesh_event(self, *args, **kwargs):
        kwargs.setdefault("step", 1)
        # Hack to extract current scope since there's no direct API for it.
        with tf.name_scope("_") as temp_scope:
            scope = temp_scope.rstrip("/_")

        @tf2.function
        def graph_fn():
            # Recreate the active scope inside the defun since it won't propagate.
            with tf.name_scope(scope):
                summary.mesh(*args, **kwargs)

        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            graph_fn()
        writer.close()


if __name__ == "__main__":
    tf.test.main()
