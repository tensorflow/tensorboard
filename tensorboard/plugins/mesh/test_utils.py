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
"""Test utils for mesh plugin tests."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json

import numpy as np

from tensorboard.util import tb_logging

Mesh = collections.namedtuple("Mesh", ("vertices", "faces", "colors"))
logger = tb_logging.get_logger()


def get_random_mesh(
    num_vertices, add_faces=False, add_colors=False, batch_size=1
):
    """Returns a random point cloud, optionally with random disconnected faces.

    Args:
      num_vertices: Number of vertices in the point cloud or mesh.
      add_faces: Random faces will be generated and added to the mesh when True.
      add_colors: Random colors will be assigned to each vertex when True. Each
        color will be in a range of [0, 255].
      batch_size: Size of batch dimension in output array.

    Returns:
      Mesh namedtuple with vertices and optionally with faces and/or colors.
    """
    vertices = np.random.random([num_vertices, 3]) * 1000
    # Add batch dimension.
    vertices = np.tile(vertices, [batch_size, 1, 1])
    faces = None
    colors = None
    if add_faces:
        arranged_vertices = np.random.permutation(num_vertices)
        faces = []
        for i in range(num_vertices - 2):
            faces.append(
                [
                    arranged_vertices[i],
                    arranged_vertices[i + 1],
                    arranged_vertices[i + 2],
                ]
            )
        faces = np.array(faces)
        faces = np.tile(faces, [batch_size, 1, 1]).astype(np.int32)
    if add_colors:
        colors = np.random.randint(low=0, high=255, size=[num_vertices, 3])
        colors = np.tile(colors, [batch_size, 1, 1]).astype(np.uint8)
    return Mesh(vertices.astype(np.float32), faces, colors)


def deserialize_json_response(byte_content):
    """Deserializes byte content that is a JSON encoding.

    Args:
      byte_content: The byte content of a response.

    Returns:
      The deserialized python object decoded from JSON.
    """
    return json.loads(byte_content.decode("utf-8"))


def deserialize_array_buffer_response(byte_content, data_type):
    """Deserializes arraybuffer response and optionally tiles the array.

    Args:
      byte_content: The byte content of a response.
      data_type: Numpy type to parse data with.

    Returns:
      Flat numpy array with the data.
    """
    return np.frombuffer(byte_content, dtype=data_type)
