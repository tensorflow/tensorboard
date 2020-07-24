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
"""Tests for demo utils functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import tensorflow as tf

from tensorboard.plugins.mesh import demo_utils


class TestPLYReader(tf.test.TestCase):
    def test_parse_vertex(self):
        """Tests vertex coordinate and color parsing."""
        # Vertex 3D coordinates with RGBA color.
        vertex_data = [-0.249245, 1.119303, 0.3095566, 60, 253, 32, 255]
        coords, colors = demo_utils._parse_vertex(
            " ".join(map(str, vertex_data))
        )
        self.assertListEqual(coords, vertex_data[:3])
        self.assertListEqual(colors, vertex_data[3:6])

    def test_prase_vertex_expects_colors(self):
        """Tests that method will throw error if color is not poresent."""
        with self.assertRaisesRegexp(
            ValueError, "PLY file must contain vertices with colors"
        ):
            demo_utils._parse_vertex("1 2 3")

    def test_parse_face(self):
        """Tests face line parsing."""
        face_data = [3, 10, 20, 30]
        parsed_face = demo_utils._parse_face(" ".join(map(str, face_data)))
        self.assertListEqual(parsed_face, face_data[1:])

    def test_read_ascii_ply(self):
        """Tests end-to-end PLY file reading and parsing."""
        test_ply = os.path.join(
            os.path.dirname(os.environ["TEST_BINARY"]),
            "test_data",
            "icosphere.ply",
        )
        vertices, colors, faces = demo_utils.read_ascii_ply(test_ply)
        self.assertEqual(len(vertices), 82)
        self.assertEqual(len(vertices), len(colors))
        self.assertEqual(len(faces), 80)


if __name__ == "__main__":
    tf.test.main()
