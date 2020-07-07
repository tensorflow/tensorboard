"""Tests for the npmi plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
import os

import numpy as np
import tensorflow as tf

from tensorboard.webapp.plugins.npmi import summary

class SummaryTest(tf.test.TestCase):
  def setUp(self):
    super(SummaryTest, self).setUp()

  def testMetadata(self):
    metadata = summary._create_summary_metadata(None, 'test')
    self.assertEqual(metadata.plugin_data.plugin_name, 'npmi')
    self.assertEqual(metadata.plugin_data.content, b'test')

  def testMetricResults(self):
    python_annotations = ['name_1', 'name_2']
    tensor_annotations = tf.convert_to_tensor(python_annotations)
    self.write_results('metric_annotations', 'test', tensor_annotations)
    event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), "*")))
    self.assertEqual(len(event_files), 1)
    for summary in tf.compat.v1.train.summary_iterator(event_files[0]):
      for value in summary.summary.value:
        self.assertEqual(value.tag, 'metric_annotations')
        parsed = tf.make_ndarray(value.tensor)
        self.assertAllEqual(parsed, [b'name_1', b'name_2'])

  def write_results(self, name, title, tensor):
    writer = tf.compat.v2.summary.create_file_writer(self.get_temp_dir())
    with writer.as_default():
      summary.metric_results(name, title, tensor, 1)
    writer.close()



if __name__ == "__main__":
  tf.test.main()
