# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Sample image summaries exhibiting some interesting convolutions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import os.path
import textwrap

from six.moves import urllib
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.plugins.image import summary as image_summary


# Directory into which to write tensorboard data.
LOGDIR = '/tmp/images_demo'

# pylint: disable=line-too-long
IMAGE_URL = r'https://upload.wikimedia.org/wikipedia/commons/f/f0/Valve_original_%281%29.PNG'
# pylint: enable=line-too-long
IMAGE_CREDIT = textwrap.dedent(
    """\
    Photo by Wikipedia contributor [User:Tauraloke], distributed under
    CC-BY-SA 3.0. [Source].

    [User:Tauraloke]: https://commons.wikimedia.org/wiki/User:Tauraloke
    [Source]: https://commons.wikimedia.org/wiki/File:Valve_original_(1).PNG
    """)
(IMAGE_WIDTH, IMAGE_HEIGHT) = (640, 480)
_IMAGE_DATA = None


def image_data(verbose=False):
  """Get the raw encoded image data, downloading it if necessary."""
  # This is a principled use of the `global` statement; don't lint me.
  global _IMAGE_DATA  # pylint: disable=global-statement
  if _IMAGE_DATA is None:
    if verbose:
      tf.logging.info("--- Downloading image.")
    with contextlib.closing(urllib.request.urlopen(IMAGE_URL)) as infile:
      _IMAGE_DATA = infile.read()
  return _IMAGE_DATA


def convolve(image, pixel_filter, channels=3, name=None):
  """Perform a 2D pixel convolution on the given image.

  Arguments:
    image: A 3D `float32` `Tensor` of shape `[height, width, channels]`,
      where `channels` is the third argument to this function and the
      first two dimensions are arbitrary.
    pixel_filter: A 2D `Tensor`, representing pixel weightings for the
      kernel. This will be used to create a 4D kernel---the extra two
      dimensions are for channels (see `tf.nn.conv2d` documentation),
      and the kernel will be constructed so that the channels are
      independent: each channel only observes the data from neighboring
      pixels of the same channel.
    channels: An integer representing the number of channels in the
      image (e.g., 3 for RGB).

  Returns:
    A 3D `float32` `Tensor` of the same shape as the input.
  """
  with tf.name_scope(name, 'convolve'):
    tf.assert_type(image, tf.float32)
    channel_filter = tf.eye(channels)
    filter_ = (tf.expand_dims(tf.expand_dims(pixel_filter, -1), -1) *
               tf.expand_dims(tf.expand_dims(channel_filter, 0), 0))
    result_batch = tf.nn.conv2d(tf.stack([image]),  # batch
                                filter=filter_,
                                strides=[1, 1, 1, 1],
                                padding='SAME')
    return result_batch[0]  # unbatch


def get_image(verbose=False):
  """Get the image as a TensorFlow variable.

  Returns:
    A `tf.Variable`, which must be initialized prior to use:
    invoke `sess.run(result.initializer)`."""
  base_data = tf.constant(image_data(verbose=verbose))
  base_image = tf.image.decode_image(base_data, channels=3)
  base_image.set_shape((IMAGE_HEIGHT, IMAGE_WIDTH, 3))
  parsed_image = tf.Variable(base_image, name='image', dtype=tf.uint8)
  return parsed_image


def run_box_to_gaussian(logdir, verbose=False):
  """Run a box-blur-to-Gaussian-blur demonstration.

  See the summary description for more details.

  Arguments:
    logdir: Directory into which to write event logs.
    verbose: Boolean; whether to log any output.
  """
  if verbose:
    tf.logging.info('--- Starting run: box_to_gaussian')

  tf.reset_default_graph()
  tf.set_random_seed(0)

  image = get_image(verbose=verbose)
  blur_radius = tf.placeholder(shape=(), dtype=tf.int32)
  with tf.name_scope('filter'):
    blur_side_length = blur_radius * 2 + 1
    pixel_filter = tf.ones((blur_side_length, blur_side_length))
    pixel_filter = (pixel_filter
                    / tf.cast(tf.size(pixel_filter), tf.float32))  # normalize

  iterations = 4
  images = [tf.cast(image, tf.float32) / 255.0]
  for _ in xrange(iterations):
    images.append(convolve(images[-1], pixel_filter))
  with tf.name_scope('convert_to_uint8'):
    images = tf.stack(
        [tf.cast(255 * tf.clip_by_value(image_, 0.0, 1.0), tf.uint8)
         for image_ in images])

  summ = image_summary.op(
      'box_to_gaussian', images, max_outputs=iterations,
      display_name='Gaussian blur as a limit process of box blurs',
      description=('Demonstration of forming a Gaussian blur by '
                   'composing box blurs, each of which can be expressed '
                   'as a 2D convolution.\n\n'
                   'A Gaussian blur is formed by convolving a Gaussian '
                   'kernel over an image. But a Gaussian kernel is '
                   'itself the limit of convolving a constant kernel '
                   'with itself many times. Thus, while applying '
                   'a box-filter convolution just once produces '
                   'results that are noticeably different from those '
                   'of a Gaussian blur, repeating the same convolution '
                   'just a few times causes the result to rapidly '
                   'converge to an actual Gaussian blur.\n\n'
                   'Here, the step value controls the blur radius, '
                   'and the image sample controls the number of times '
                   'that the convolution is applied (plus one). '
                   'So, when *sample*=1, the original image is shown; '
                   '*sample*=2 shows a box blur; and a hypothetical '
                   '*sample*=&infin; would show a true Gaussian blur.\n\n'
                   'This is one ingredient in a recipe to compute very '
                   'fast Gaussian blurs. The other pieces require '
                   'special treatment for the box blurs themselves '
                   '(decomposition to dual one-dimensional box blurs, '
                   'each of which is computed with a sliding window); '
                   'we don&rsquo;t perform those optimizations here.\n\n'
                   '[Here are some slides describing the full process.]'
                   '(%s)\n\n'
                   '%s'
                   % ('http://elynxsdk.free.fr/ext-docs/Blur/Fast_box_blur.pdf',
                      IMAGE_CREDIT)))

  with tf.Session() as sess:
    sess.run(image.initializer)
    writer = tf.summary.FileWriter(os.path.join(logdir, 'box_to_gaussian'))
    writer.add_graph(sess.graph)
    for step in xrange(8):
      if verbose:
        tf.logging.info('--- box_to_gaussian: step: %s' % step)
        feed_dict = {blur_radius: step}
      run_options = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
      run_metadata = tf.RunMetadata()
      s = sess.run(summ, feed_dict=feed_dict,
                   options=run_options, run_metadata=run_metadata)
      writer.add_summary(s, global_step=step)
      writer.add_run_metadata(run_metadata, 'step_%04d' % step)
    writer.close()


def run_sobel(logdir, verbose=False):
  """Run a Sobel edge detection demonstration.

  See the summary description for more details.

  Arguments:
    logdir: Directory into which to write event logs.
    verbose: Boolean; whether to log any output.
  """
  if verbose:
    tf.logging.info('--- Starting run: sobel')

  tf.reset_default_graph()
  tf.set_random_seed(0)

  image = get_image(verbose=verbose)
  kernel_radius = tf.placeholder(shape=(), dtype=tf.int32)

  with tf.name_scope('horizontal_kernel'):
    kernel_side_length = kernel_radius * 2 + 1
    # Drop off influence for pixels further away from the center.
    weighting_kernel = (
        1.0 - tf.abs(tf.linspace(-1.0, 1.0, num=kernel_side_length)))
    differentiation_kernel = tf.linspace(-1.0, 1.0, num=kernel_side_length)
    horizontal_kernel = tf.matmul(tf.expand_dims(weighting_kernel, 1),
                                  tf.expand_dims(differentiation_kernel, 0))

  with tf.name_scope('vertical_kernel'):
    vertical_kernel = tf.transpose(horizontal_kernel)

  float_image = tf.cast(image, tf.float32)
  dx = convolve(float_image, horizontal_kernel, name='convolve_dx')
  dy = convolve(float_image, vertical_kernel, name='convolve_dy')
  gradient_magnitude = tf.norm([dx, dy], axis=0, name='gradient_magnitude')
  with tf.name_scope('normalized_gradient'):
    normalized_gradient = gradient_magnitude / tf.reduce_max(gradient_magnitude)
  with tf.name_scope('output_image'):
    output_image = tf.cast(255 * normalized_gradient, tf.uint8)

  summ = image_summary.op(
      'sobel', tf.stack([output_image]),
      display_name='Sobel edge detection',
      description=(u'Demonstration of [Sobel edge detection]. The step '
                   'parameter adjusts the radius of the kernel. '
                   'The kernel can be of arbitrary size, and considers '
                   u'nearby pixels with \u2113\u2082-linear falloff.\n\n'
                   # (that says ``$\ell_2$-linear falloff'')
                   'Edge detection is done on a per-channel basis, so '
                   'you can observe which edges are &ldquo;mostly red '
                   'edges,&rdquo; for instance.\n\n'
                   'For practical edge detection, a small kernel '
                   '(usually not more than more than *r*=2) is best.\n\n'
                   '[Sobel edge detection]: %s\n\n'
                   "%s"
                   % ('https://en.wikipedia.org/wiki/Sobel_operator',
                      IMAGE_CREDIT)))

  with tf.Session() as sess:
    sess.run(image.initializer)
    writer = tf.summary.FileWriter(os.path.join(logdir, 'sobel'))
    writer.add_graph(sess.graph)
    for step in xrange(8):
      if verbose:
        tf.logging.info("--- sobel: step: %s" % step)
        feed_dict = {kernel_radius: step}
      run_options = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
      run_metadata = tf.RunMetadata()
      s = sess.run(summ, feed_dict=feed_dict,
                   options=run_options, run_metadata=run_metadata)
      writer.add_summary(s, global_step=step)
      writer.add_run_metadata(run_metadata, 'step_%04d' % step)
    writer.close()


def run_all(logdir, verbose=False):
  """Run simulations on a reasonable set of parameters.

  Arguments:
    logdir: the directory into which to store all the runs' data
    verbose: if true, print out each run's name as it begins
  """
  run_box_to_gaussian(logdir, verbose=verbose)
  run_sobel(logdir, verbose=verbose)


def main(unused_argv):
  tf.logging.set_verbosity(tf.logging.INFO)
  tf.logging.info('Saving output to %s.' % LOGDIR)
  run_all(LOGDIR, verbose=True)
  tf.logging.info('Done. Output saved to %s.' % LOGDIR)


if __name__ == '__main__':
  tf.app.run()
