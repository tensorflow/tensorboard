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
"""Simple demo which displays constant 3D mesh."""

from absl import app
from absl import flags
import numpy as np
import tensorflow as tf

from tensorboard.plugins.mesh import summary_v2 as mesh_summary
from tensorboard.plugins.mesh import demo_utils


flags.DEFINE_string(
    "logdir", "/tmp/mesh_demo", "Directory to write event logs to."
)

FLAGS = flags.FLAGS

# Max number of steps to run training with.
_MAX_STEPS = 10

DEMO_PLY_MESH_PATH = "tensorboard/plugins/mesh/test_data/icosphere.ply"


def train_step(vertices, faces, colors, config_dict, step):
    """Executes summary as a train step."""
    # Change colors over time.
    t = float(step) / _MAX_STEPS
    transformed_colors = t * (255 - colors) + (1 - t) * colors
    mesh_summary.mesh(
        "mesh_color_tensor",
        vertices=vertices,
        faces=faces,
        colors=transformed_colors,
        config_dict=config_dict,
        step=step,
    )


def run():
    """Runs training steps with a mesh summary."""
    # Camera and scene configuration.
    config_dict = {"camera": {"cls": "PerspectiveCamera", "fov": 75}}

    # Read sample PLY file.
    vertices, colors, faces = demo_utils.read_ascii_ply(DEMO_PLY_MESH_PATH)

    # Add batch dimension.
    vertices = np.expand_dims(vertices, 0)
    faces = np.expand_dims(faces, 0)
    colors = np.expand_dims(colors, 0)

    # Create summary writer.
    writer = tf.summary.create_file_writer(FLAGS.logdir)

    with writer.as_default():
        for step in range(_MAX_STEPS):
            train_step(vertices, faces, colors, config_dict, step)


def main(unused_argv):
    print("Saving output to %s." % FLAGS.logdir)
    print(
        "To view results in your browser, run `tensorboard --logdir %s`"
        % FLAGS.logdir
    )
    run()
    print("Done. Output saved to %s." % FLAGS.logdir)


if __name__ == "__main__":
    app.run(main)
