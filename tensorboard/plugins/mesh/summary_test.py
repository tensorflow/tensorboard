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

import json
import tensorflow as tf

from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.mesh import summary
from tensorboard.plugins.mesh import metadata
from tensorboard.plugins.mesh import plugin_data_pb2
from tensorboard.plugins.mesh import test_utils


class MeshSummaryTest(tf.test.TestCase):
    def pb_via_op(self, summary_op):
        """Parses pb proto."""
        actual_pbtxt = summary_op.eval()
        actual_proto = summary_pb2.Summary()
        actual_proto.ParseFromString(actual_pbtxt)
        return actual_proto

    def get_components(self, proto):
        return metadata.parse_plugin_metadata(
            proto.metadata.plugin_data.content
        ).components

    def verify_proto(self, proto, name):
        """Validates proto."""
        self.assertEqual(3, len(proto.value))
        self.assertEqual("%s_VERTEX" % name, proto.value[0].tag)
        self.assertEqual("%s_FACE" % name, proto.value[1].tag)
        self.assertEqual("%s_COLOR" % name, proto.value[2].tag)

        self.assertEqual(14, self.get_components(proto.value[0]))
        self.assertEqual(14, self.get_components(proto.value[1]))
        self.assertEqual(14, self.get_components(proto.value[2]))

    def test_get_tensor_summary(self):
        """Tests proper creation of tensor summary with mesh plugin
        metadata."""
        name = "my_mesh"
        display_name = "my_display_name"
        description = "my mesh is the best of meshes"
        tensor_data = test_utils.get_random_mesh(100)
        components = 14
        with tf.compat.v1.Graph().as_default():
            tensor_summary = summary._get_tensor_summary(
                name,
                display_name,
                description,
                tensor_data.vertices,
                plugin_data_pb2.MeshPluginData.VERTEX,
                components,
                "",
                None,
            )
            with self.test_session():
                proto = self.pb_via_op(tensor_summary)
                self.assertEqual("%s_VERTEX" % name, proto.value[0].tag)
                self.assertEqual(
                    metadata.PLUGIN_NAME,
                    proto.value[0].metadata.plugin_data.plugin_name,
                )
                self.assertEqual(
                    components, self.get_components(proto.value[0])
                )

    def test_op(self):
        """Tests merged summary with different types of data."""
        name = "my_mesh"
        tensor_data = test_utils.get_random_mesh(
            100, add_faces=True, add_colors=True
        )
        config_dict = {"foo": 1}
        with tf.compat.v1.Graph().as_default():
            tensor_summary = summary.op(
                name,
                tensor_data.vertices,
                faces=tensor_data.faces,
                colors=tensor_data.colors,
                config_dict=config_dict,
            )
            with self.test_session() as sess:
                proto = self.pb_via_op(tensor_summary)
                self.verify_proto(proto, name)
                plugin_metadata = metadata.parse_plugin_metadata(
                    proto.value[0].metadata.plugin_data.content
                )
                self.assertEqual(
                    json.dumps(config_dict, sort_keys=True),
                    plugin_metadata.json_config,
                )

    def test_pb(self):
        """Tests merged summary protobuf with different types of data."""
        name = "my_mesh"
        tensor_data = test_utils.get_random_mesh(
            100, add_faces=True, add_colors=True
        )
        config_dict = {"foo": 1}
        proto = summary.pb(
            name,
            tensor_data.vertices,
            faces=tensor_data.faces,
            colors=tensor_data.colors,
            config_dict=config_dict,
        )
        self.verify_proto(proto, name)
        plugin_metadata = metadata.parse_plugin_metadata(
            proto.value[0].metadata.plugin_data.content
        )
        self.assertEqual(
            json.dumps(config_dict, sort_keys=True), plugin_metadata.json_config
        )


if __name__ == "__main__":
    tf.test.main()
