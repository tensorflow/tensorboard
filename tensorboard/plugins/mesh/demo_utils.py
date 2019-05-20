"""Utils used for the mesh demo."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf


def parse_vertex(vertex_row):
  """Parses a line in a PLY file which encodes a vertex coordinates.

  Args:
    vertex_row: string with vertex coordinates and color.

  Returns:
    [3,] array of vertex coordinates and [3,] array with RGB color.
  """
  vertex = map(float, vertex_row.strip().split(' '))
  # The row will contain either just coordinates or RGB/RGBA color in addition
  # to that.
  assert len(vertex) == 3 or len(vertex) == 6 or len(vertex) == 7
  if len(vertex) >= 6:
    # Supports only RGB colors now, alpha channel will be ignored.
    # TODO(b/129298103): add support of RGBA in .ply files.
    return vertex[:3], vertex[3:6]
  raise ValueError('PLY file must contain vertices with colors.')


def parse_face(face_row):
  """Parses a line in a PLY file which encodes a face of the mesh."""
  face = map(int, face_row.strip().split(' '))
  # Assert that number of vertices in a face is 3, i.e. it is a triangle
  assert face[0] == 3
  return face[1:]


def read_ascii_ply(filename):
  """Reads a PLY file encoded in ASCII format.

  NOTE: this util method is not intended to be comprehensive PLY reader
  and serves as part of demo application.

  Args:
    filename: path to a PLY file to read.

  Returns:
    numpy Nx3 array of vertices, Nx3 array of colors and Nx3 array of faces
    of the mesh.
  """
  header_size = 0
  vertices = []
  colors = []
  faces = []
  with tf.gfile.Open(filename) as ply_file:
    lines = ply_file.readlines()
    while not lines[header_size].startswith('end_header'):
      if lines[header_size].startswith('element vertex'):
        vert_count = int(lines[header_size].split(' ')[-1])
      if lines[header_size].startswith('element face'):
        face_count = int(lines[header_size].split(' ')[-1])
      header_size += 1
    header_size += 1
    # Read vertices and their colors.
    for i in range(header_size, header_size + vert_count):
      vertex, color = parse_vertex(lines[i])
      vertices.append(vertex)      
      colors.append(color)
    # Read faces.
    for i in range(
      header_size + vert_count, header_size + vert_count + face_count):
      faces.append(parse_face(lines[i]))
    return np.array(vertices), np.array(colors), np.array(faces)    
