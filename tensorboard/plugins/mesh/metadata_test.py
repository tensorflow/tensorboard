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
"""Tests for util functions to create/parse mesh plugin metadata."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from mock import patch
import six
import tensorflow as tf
from tensorboard.plugins.mesh import metadata
from tensorboard.plugins.mesh import plugin_data_pb2


class MetadataTest(tf.test.TestCase):
    def _create_metadata(self, shape=None):
        """Creates metadata with dummy data."""
        self.name = "unique_name"
        self.display_name = "my mesh"
        self.json_config = "{}"
        if shape is None:
            shape = [1, 100, 3]
        self.shape = shape
        self.components = 14
        self.summary_metadata = metadata.create_summary_metadata(
            self.name,
            self.display_name,
            plugin_data_pb2.MeshPluginData.ContentType.Value("VERTEX"),
            self.components,
            self.shape,
            json_config=self.json_config,
        )

    def test_get_instance_name(self):
        """Tests proper creation of instance name based on display_name."""
        display_name = "my_mesh"
        instance_name = metadata.get_instance_name(
            display_name,
            plugin_data_pb2.MeshPluginData.ContentType.Value("VERTEX"),
        )
        self.assertEqual("%s_VERTEX" % display_name, instance_name)

    def test_create_summary_metadata(self):
        """Tests MeshPlugin metadata creation."""
        self._create_metadata()
        self.assertEqual(self.display_name, self.summary_metadata.display_name)
        self.assertEqual(
            metadata.PLUGIN_NAME, self.summary_metadata.plugin_data.plugin_name
        )

    def test_parse_plugin_metadata(self):
        """Tests parsing of saved plugin metadata."""
        self._create_metadata()
        parsed_metadata = metadata.parse_plugin_metadata(
            self.summary_metadata.plugin_data.content
        )
        self.assertEqual(self.name, parsed_metadata.name)
        self.assertEqual(
            plugin_data_pb2.MeshPluginData.ContentType.Value("VERTEX"),
            parsed_metadata.content_type,
        )
        self.assertEqual(self.shape, parsed_metadata.shape)
        self.assertEqual(self.json_config, parsed_metadata.json_config)
        self.assertEqual(self.components, parsed_metadata.components)

    def test_metadata_version(self):
        """Tests that only the latest version of metadata is supported."""
        with patch.object(metadata, "get_current_version", return_value=100):
            self._create_metadata()
        # Change the version.
        with patch.object(metadata, "get_current_version", return_value=1):
            # Try to parse metadata from a prior version.
            with self.assertRaises(ValueError):
                metadata.parse_plugin_metadata(
                    self.summary_metadata.plugin_data.content
                )

    def test_tensor_shape(self):
        """Tests that target tensor should be of particular shape."""
        with six.assertRaisesRegex(
            self, ValueError, r"Tensor shape should be of shape BxNx3.*"
        ):
            self._create_metadata([1])

    def test_metadata_format(self):
        """Tests that metadata content must be passed as a serialized
        string."""
        with six.assertRaisesRegex(
            self, TypeError, r"Content type must be bytes."
        ):
            metadata.parse_plugin_metadata(123)

    def test_default_components(self):
        """Tests that defult components are added when necessary."""
        self._create_metadata()
        stored_metadata = plugin_data_pb2.MeshPluginData(
            version=metadata.get_current_version(), components=0
        )
        parsed_metadata = metadata.parse_plugin_metadata(
            stored_metadata.SerializeToString()
        )
        self.assertGreater(parsed_metadata.components, 0)


if __name__ == "__main__":
    tf.test.main()
