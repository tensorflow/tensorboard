# Copyright 2016 The TensorFlow Authors. All Rights Reserved.
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
"""API tests for the projector plugin in TensorBoard."""


import os

import tensorflow as tf

from google.protobuf import text_format

from tensorboard.plugins import projector
from tensorboard.util import test_util


def create_dummy_config():
    return projector.ProjectorConfig(
        model_checkpoint_path="test",
        embeddings=[
            projector.EmbeddingInfo(
                tensor_name="tensor1",
                metadata_path="metadata1",
            ),
        ],
    )


class ProjectorApiTest(tf.test.TestCase):
    def test_visualize_embeddings_with_logdir(self):
        logdir = self.get_temp_dir()
        config = create_dummy_config()
        projector.visualize_embeddings(logdir, config)

        # Read the configurations from disk and make sure it matches the original.
        with tf.io.gfile.GFile(
            os.path.join(logdir, "projector_config.pbtxt")
        ) as f:
            config2 = projector.ProjectorConfig()
            text_format.Parse(f.read(), config2)

        self.assertEqual(config, config2)

    def test_visualize_embeddings_with_file_writer(self):
        if tf.__version__ == "stub":
            self.skipTest("Requires TensorFlow for FileWriter")
        logdir = self.get_temp_dir()
        config = create_dummy_config()

        with tf.compat.v1.Graph().as_default():
            with test_util.FileWriterCache.get(logdir) as writer:
                projector.visualize_embeddings(writer, config)

        # Read the configurations from disk and make sure it matches the original.
        with tf.io.gfile.GFile(
            os.path.join(logdir, "projector_config.pbtxt")
        ) as f:
            config2 = projector.ProjectorConfig()
            text_format.Parse(f.read(), config2)

        self.assertEqual(config, config2)

    def test_visualize_embeddings_no_logdir(self):
        with self.assertRaisesRegex(
            ValueError, "Expected logdir to be a path, but got None"
        ):
            projector.visualize_embeddings(None, create_dummy_config())


if __name__ == "__main__":
    tf.test.main()
