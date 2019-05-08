"""Simple demo which displays constant 3D mesh."""
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
"""Demo application for Mesh Plugin."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import numpy as np
import tensorflow as tf
import trimesh

from tensorboard.plugins.mesh import summary as mesh_summary

tf.flags.DEFINE_string('logdir', '/tmp/mesh_demo',
                       'Directory to write event logs to.')
tf.flags.DEFINE_string('sample_meshes', '',
                       'Path to folder with PLY files or string of comma '
                       'separated PLY files to visualize.')
tf.flags.DEFINE_integer('batch_size', 1,
                        'Size of the batch. All provided PLY files will be '
                        'divided into batch_size groups and used at different '
                        'steps during training.')
FLAGS = tf.flags.FLAGS

tf.compat.v1.disable_v2_behavior()


def run():
  """Runs session with mesh summaries."""
  # Camera and scene configuration.
  config_dict = {
      'camera': {'cls': 'PerspectiveCamera', 'fov': 75}
  }
  all_vertices = []
  all_colors = []
  all_faces = []

  # Either get all the files from the provided directory or split predefined
  # comma-separated list of files to use.
  if tf.io.gfile.isdir(FLAGS.sample_meshes):
    file_paths = tf.io.gfile.listdir(FLAGS.sample_meshes)
    file_paths = [os.path.join(FLAGS.sample_meshes, file_name)
                  for file_name in file_paths]
  else:
    file_paths = FLAGS.sample_meshes.split(',')
  tf.logging.info('Found %d files.', len(file_paths))

  # Read all sample PLY files.
  for sample_mesh in file_paths:
    mesh = trimesh.load(sample_mesh)
    all_vertices.append(np.array(mesh.vertices))
    # Currently only supports RGB colors.
    all_colors.append(np.array(mesh.visual.vertex_colors[:, :3]))
    all_faces.append(np.array(mesh.faces))

  all_vertices = np.stack(all_vertices, axis=0)
  all_faces = np.stack(all_faces, axis=0)
  all_colors = np.stack(all_colors, axis=0)
  batch_size = FLAGS.batch_size

  vertices_tensor = tf.placeholder(
      tf.float32, [batch_size] + list(all_vertices.shape[1:]))
  faces_tensor = tf.placeholder(
      tf.int32, [batch_size] + list(all_faces.shape[1:]))
  colors_tensor = tf.placeholder(
      tf.int32, [batch_size] + list(all_colors.shape[1:]))

  meshes_summary = mesh_summary.op(
      'mesh_color_tensor', vertices=vertices_tensor, faces=faces_tensor,
      colors=colors_tensor, config_dict=config_dict)

  # Create summary writer and session.
  writer = tf.summary.FileWriter(FLAGS.logdir)
  sess = tf.Session()

  # Perform exactly the number of steps required to feed all the data once.
  steps = int(
      (all_vertices.shape[0] + batch_size - 1) / batch_size)
  tf.logging.info('Run for %d steps.', steps)
  for i in range(steps):
    start = i * batch_size
    end = (i + 1) * batch_size
    summaries = sess.run([meshes_summary], feed_dict={
        vertices_tensor: all_vertices[start:end, :, :],
        faces_tensor: all_faces[start:end, :, :],
        colors_tensor: all_colors[start:end, :, :],
    })
    # Save summaries.
    for summary in summaries:
      writer.add_summary(summary)


def main(unused_argv):
  tf.logging.info('Saving output to %s.', FLAGS.logdir)
  run()
  tf.logging.info('Done. Output saved to %s.', FLAGS.logdir)


if __name__ == '__main__':
  tf.app.run()
