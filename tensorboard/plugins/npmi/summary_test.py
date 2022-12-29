# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for the npmi plugin summary generation functions."""


import glob
import os

import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.plugins.npmi import summary
from tensorboard.plugins.npmi import metadata

try:
    tf2.__version__  # Force lazy import to resolve
except ImportError:
    tf2 = None

try:
    tf.compat.v1.enable_eager_execution()
except AttributeError:
    # TF 2.0 doesn't have this symbol because eager is the default.
    pass


class SummaryTest(tf.test.TestCase):
    def setUp(self):
        super().setUp()
        if tf2 is None:
            self.skipTest("v2 summary API not available")

    def testMetadata(self):
        data = metadata.create_summary_metadata(None)
        plugin_data = data.plugin_data
        content = plugin_data.content
        metadata_content = metadata.parse_plugin_metadata(content)
        self.assertEqual(data.plugin_data.plugin_name, "npmi")

    def testMetricResults(self):
        python_annotations = ["name_1", "name_2"]
        tensor_annotations = tf.convert_to_tensor(python_annotations)
        self.write_results(tensor_annotations)
        event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), "*")))
        self.assertEqual(len(event_files), 1)
        for summary in tf.compat.v1.train.summary_iterator(event_files[0]):
            for value in summary.summary.value:
                self.assertEqual(value.tag, metadata.ANNOTATIONS_TAG)
                parsed = tf.make_ndarray(value.tensor)
                self.assertAllEqual(parsed, [b"name_1", b"name_2"])

    def write_results(self, tensor):
        writer = tf2.summary.create_file_writer(self.get_temp_dir())
        with writer.as_default():
            summary.npmi_annotations(tensor, 1)
        writer.close()


if __name__ == "__main__":
    tf.test.main()
