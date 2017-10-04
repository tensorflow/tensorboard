from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from beholder import visualizer
from beholder.shared_config import SECTION_HEIGHT,\
  IMAGE_WIDTH

class VisualizerTest(tf.test.TestCase):

  def setUp(self):
    session = tf.Session()
    visualizer.MIN_SQUARE_SIZE = 1
    path = '/tmp/beholder-test/plugins/beholder/'
    self.visualizer = visualizer.Visualizer(path)
    self.visualizer.config['mode'] = 'current'


  def test_reshape_conv_array(self):
    max_size = 5

    for height in range(1, max_size): # pylint:disable=too-many-nested-blocks
      # for width in range(1, max_size):
      width = height
      for in_channel in range(1, max_size):
        for out_channel in range(1, max_size):
          shape = [height, width, in_channel, out_channel]
          array = np.reshape(range(np.prod(shape)), shape)
          reshaped = self.visualizer._reshape_conv_array(array,
                                                         SECTION_HEIGHT,
                                                         IMAGE_WIDTH)

          for in_number in range(in_channel):
            for out_number in range(out_channel):
              start_row = in_number * height
              start_col = out_number * width
              to_test = reshaped[start_row: start_row + height,
                                 start_col: start_col + width]
              true = array[:, :, in_number, out_number]
              self.assertAllEqual(true, to_test)


  def test_arrays_to_sections(self):
    array_1 = np.array(range(0, 100)).reshape(10, 10).astype(float)
    section = self.visualizer._arrays_to_sections([array_1])[0]
    self.assertEqual(section[0, 0], 0)
    self.assertEqual(section[-1, -1], 99)


  def test_sections_to_variance_sections(self):
    sections_over_time = [
        [[[1.0, 2.0, 3.0]]],
        [[[0.0, 2.0, 4.0]]]
    ]

    sec = self.visualizer._sections_to_variance_sections(sections_over_time)[0]
    self.assertEqual(.25, sec[0, 0])
    self.assertEqual(0, sec[0, 1])
    self.assertEqual(.25, sec[0, 2])


  def test_sections_to_image(self):
    image = self.visualizer._sections_to_image([
        np.random.random((10, 10))
    ])

    # To allow for floating point issues.
    # x = np.array([254.9999999995])
    # x.max() == 255.0
    # x.astype(np.uint8).max() == 254
    self.assertLessEqual(image.min(), 1)
    self.assertGreaterEqual(image.max(), 254)


if __name__ == '__main__':
  tf.test.main()
