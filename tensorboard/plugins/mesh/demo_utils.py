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
"""Utils used for the mesh demo."""


import numpy as np
import tensorflow as tf


def _parse_vertex(vertex_row):
    """Parses a line in a PLY file which encodes a vertex coordinates.

    Args:
      vertex_row: string with vertex coordinates and color.

    Returns:
      2-tuple containing a length-3 array of vertex coordinates (as
      floats) and a length-3 array of RGB color values (as ints between 0
      and 255, inclusive).
    """
    vertex = vertex_row.strip().split()
    # The row must contain coordinates with RGB/RGBA color in addition to that.
    if len(vertex) >= 6:
        # Supports only RGB colors now, alpha channel will be ignored.
        # TODO(b/129298103): add support of RGBA in .ply files.
        return (
            [float(coord) for coord in vertex[:3]],
            [int(channel) for channel in vertex[3:6]],
        )
    raise ValueError("PLY file must contain vertices with colors.")


def _parse_face(face_row):
    """Parses a line in a PLY file which encodes a face of the mesh."""
    face = [int(index) for index in face_row.strip().split()]
    # Assert that number of vertices in a face is 3, i.e. it is a triangle
    if len(face) != 4 or face[0] != 3:
        raise ValueError(
            "Only supports face representation as a string with 4 numbers."
        )

    return face[1:]


def read_ascii_ply(filename):
    """Reads a PLY file encoded in ASCII format.

    NOTE: this util method is not intended to be comprehensive PLY reader
    and serves as part of demo application.

    Args:
      filename: path to a PLY file to read.

    Returns:
      numpy `[dim_1, 3]` array of vertices, `[dim_1, 3]` array of colors and
      `[dim_1, 3]` array of faces of the mesh.
    """
    with tf.io.gfile.GFile(filename) as ply_file:
        for line in ply_file:
            if line.startswith("end_header"):
                break
            elif line.startswith("element vertex"):
                vert_count = int(line.split()[-1])
            elif line.startswith("element face"):
                face_count = int(line.split()[-1])
        # Read vertices and their colors.
        vertex_data = [_parse_vertex(next(ply_file)) for _ in range(vert_count)]
        vertices = [datum[0] for datum in vertex_data]
        colors = [datum[1] for datum in vertex_data]
        # Read faces.
        faces = [_parse_face(next(ply_file)) for _ in range(face_count)]
        return (
            np.array(vertices).astype(np.float32),
            np.array(colors).astype(np.uint8),
            np.array(faces).astype(np.int32),
        )
