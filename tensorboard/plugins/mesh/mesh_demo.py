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
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

from absl import app
from absl import flags
import numpy as np
import tensorflow as tf


from tensorboard.plugins.mesh import summary as mesh_summary
from tensorboard.plugins.mesh import demo_utils

flags.DEFINE_string('logdir', '/tmp/mesh_demo',
                    'Directory to write event logs to.')
flags.DEFINE_string('mesh_path', None, 'Path to PLY file to visualize.')

FLAGS = flags.FLAGS

tf.compat.v1.disable_v2_behavior()


def run():
  """Runs session with a mesh summary."""
  
  # Camera and scene configuration.
  config_dict = {
      'camera': {'cls': 'PerspectiveCamera', 'fov': 75}
  }

  # Read sample PLY file.
  vertices, colors, faces = demo_utils.read_ascii_ply(FLAGS.mesh_path)
  
  # Add batch dimension.
  vertices = np.expand_dims(vertices, 0)
  faces = np.expand_dims(faces, 0)
  colors = np.expand_dims(colors, 0)  
  
  # Create placeholders for tensors representing the mesh.
  vertices_tensor = tf.placeholder(
      tf.float32, vertices.shape)
  faces_tensor = tf.placeholder(
      tf.int32, faces.shape)
  colors_tensor = tf.placeholder(
      tf.int32, colors.shape)

  meshes_summary = mesh_summary.op(
      'mesh_color_tensor', vertices=vertices_tensor, faces=faces_tensor,
      colors=colors_tensor, config_dict=config_dict)

  # Create summary writer and session.
  writer = tf.summary.FileWriter(FLAGS.logdir)
  sess = tf.Session()

  for i in range(10):
    summaries = sess.run([meshes_summary], feed_dict={
        vertices_tensor: vertices,
        faces_tensor: faces,
        colors_tensor: colors,
    })
    # Save summaries.
    for summary in summaries:
      writer.add_summary(summary)


def main(unused_argv):
  tf.logging.info('Saving output to %s.', FLAGS.logdir)
  run()
  tf.logging.info('Done. Output saved to %s.', FLAGS.logdir)


if __name__ == '__main__':
  app.run(main)
