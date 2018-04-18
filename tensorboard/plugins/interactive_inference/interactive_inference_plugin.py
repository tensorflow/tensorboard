# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""The plugin serving the interactive inference tab."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import math
import numpy as np
import tensorflow as tf

from google.protobuf import json_format
from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin

from tensorboard.plugins.inference.utils import common_utils
from tensorboard.plugins.inference.utils import inference_utils
from tensorboard.plugins.inference.utils import oss_utils


class InteractiveInferencePlugin(base_plugin.TBPlugin):
  """Plugin for understanding/debugging model inference.
  """

  # This string field is used by TensorBoard to generate the paths for routes
  # provided by this plugin. It must thus be URL-friendly. This field is also
  # used to uniquely identify this plugin throughout TensorBoard. See BasePlugin
  # for details.
  plugin_name = 'interactiveinference'
  examples = []
  updated_example_indices = set()
  sprite = None

  # The standard name for encoded image features, from go/tf-example.
  image_feature_name = 'image/encoded'

  # The width and height of the thumbnail for any images for Facets Dive.
  sprite_thumbnail_dim_px = 64

  # The vocab of inference class indices to label names for the model.
  label_vocab = []

  def __init__(self, context):
    """Constructs an interactive inference plugin for TensorBoard.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._logdir = context.logdir
    self._has_auth_group = (context.flags and
                            'authorized_groups' in context.flags and
                            context.flags.authorized_groups is not '')

  def get_plugin_apps(self):
    """Obtains a mapping between routes and handlers. Stores the logdir.

    Returns:
      A mapping between routes and handlers (functions that respond to
      requests).
    """
    return {
        '/infer': self._infer,
        '/update_example': self._update_example,
        '/examples_from_path': self._examples_from_path_handler,
        '/sprite': self._serve_sprite,
    }

  def is_active(self):
    """Determines whether this plugin is active.

    Returns:
      A boolean. Whether this plugin is active.
    """
    # TODO(b/69305872): Maybe enable if config flags were specified?
    return False

  @wrappers.Request.application
  def _examples_from_path_handler(self, request):
    """Returns a pretty-printed string of the tf.train.Example.

    Args:
      request: A request that should contain 'examples_path' and 'max_examples'.

    Returns:
      JSON of up to max_examlpes of the tf.train.Examples in the path.
    """
    examples_count = int(request.args.get('max_examples'))
    examples_path = request.args.get('examples_path')
    try:
      oss_utils.throw_if_file_access_not_allowed(examples_path,
                                                self._logdir,
                                                self._has_auth_group)
      example_strings = oss_utils.example_protos_from_path(
          examples_path, examples_count, parse_examples=False)
      self.examples = [tf.train.Example.FromString(ex) for ex in example_strings]
      # Generate a sprite image for the examples if the examples contain the
      # standard encoded image feature.
      self.sprite = (
          self.create_sprite_image(example_strings)
          if (len(self.examples) and
              self.image_feature_name in self.examples[0].features.feature) else
          None)
      json_examples = [
          json_format.MessageToJson(example) for example in self.examples
      ]
      self.updated_example_indices = set(range(len(json_examples)))
      return http_util.Respond(
          request,
          {'examples': json_examples,
           'sprite': True if self.sprite else False}, 'application/json')
    except common_utils.InvalidUserInputError as e:
      return http_util.Respond(request, {'error': e.message},
                               'application/json')

  @wrappers.Request.application
  def _serve_sprite(self, request):
    return http_util.Respond(request, self.sprite, 'image/png')

  @wrappers.Request.application
  def _update_example(self, request):
    """Returns a pretty-printed string of the tf.train.Example.

    Args:
      request: A request that should contain 'examples_path'.

    Returns:
      A pretty formatted string of the first tf.train.Example in the path.
    """
    index = int(request.args.get('index'))
    example_json = request.args.get('example')
    if index >= len(self.examples):
      return http_util.Respond(request, {'error': 'invalid index provided'},
                               'application/json')
    new_example = tf.train.Example()
    json_format.Parse(example_json, new_example)
    self.examples[index] = new_example
    self.updated_example_indices.add(index)
    return http_util.Respond(request, {}, 'application/json')

  @wrappers.Request.application
  def _infer(self, request):
    """Returns JSON for the `vz-line-chart`s for a feature.

    Args:
      request: A request that should contain 'feature_name', 'examples_path',
        'inference_address', 'model_name', and 'label_vocab_path'.

    Returns:
      A list of JSON objects, one for each chart.
    """
    vocab_path = request.args.get('label_vocab_path')
    if vocab_path:
      try:
        with tf.gfile.GFile(vocab_path, 'r') as f:
          label_vocab = [line.rstrip('\n') for line in f]
      except tf.errors.NotFoundError as err:
        tf.logging.error('error reading vocab file: %s', err)
        label_vocab = []
    else:
      label_vocab = []

    try:
      if request.method != 'GET':
        tf.logging.error('%s requests are forbidden.', request.method)
        return wrappers.Response(status=405)

      serving_bundle = inference_utils.ServingBundle(
          request.args.get('inference_address'),
          request.args.get('model_name'), request.args.get('model_type'))
      indices_to_infer = sorted(self.updated_example_indices)
      examples_to_infer = [self.examples[index] for index in indices_to_infer]

      # Get inference results proto and combine with indices of inferred
      # examples and respond with this data as json.
      inference_result_proto = oss_utils.call_servo(
          examples_to_infer, serving_bundle)
      new_inferences = inference_utils.wrap_inference_results(
          inference_result_proto)
      infer_json = json_format.MessageToJson(
          new_inferences, including_default_value_fields=True)
      infer_obj = json.loads(infer_json)
      resp = {'indices': indices_to_infer, 'results': infer_obj}
      self.updated_example_indices = set()
      return http_util.Respond(request, {'inferences': json.dumps(resp),
                                         'vocab': json.dumps(label_vocab)},
                               'application/json')
    except common_utils.InvalidUserInputError as e:
      return http_util.Respond(request, {'error': e.message},
                               'application/json')

  def create_sprite_image(self, examples):
    """Returns an encoded sprite image for use in Facets Dive.

    Args:
      examples: A list of serialized example protos to get images for.

    Returns:
      An encoded PNG.
    """

    def generate_image_from_thubnails(thumbnails, thumbnail_dims):
      """Generates a sprite atlas image from a set of thumbnails."""
      num_thumbnails = tf.shape(thumbnails)[0].eval()
      images_per_row = int(math.ceil(math.sqrt(num_thumbnails)))
      thumb_height = thumbnail_dims[0]
      thumb_width = thumbnail_dims[1]
      master_height = images_per_row * thumb_height
      master_width = images_per_row * thumb_width
      num_channels = 3
      master = np.zeros([master_height, master_width, num_channels])
      for idx, image in enumerate(thumbnails.eval()):
        left_idx = idx % images_per_row
        top_idx = int(math.floor(idx / images_per_row))
        left_start = left_idx * thumb_width
        left_end = left_start + thumb_width
        top_start = top_idx * thumb_height
        top_end = top_start + thumb_height
        master[top_start:top_end, left_start:left_end, :] = image
      return tf.image.encode_png(master)

    with tf.Session():
      keys_to_features = {
          self.image_feature_name:
              tf.FixedLenFeature((), tf.string, default_value=''),
      }
      parsed = tf.parse_example(examples, keys_to_features)
      images = tf.zeros([1, 1, 1, 1], tf.float32)
      i = tf.constant(0)
      thumbnail_dims = (self.sprite_thumbnail_dim_px,
                        self.sprite_thumbnail_dim_px)
      num_examples = tf.constant(len(examples))
      encoded_images = parsed[self.image_feature_name]

      # Loop over all examples, decoding the image feature value, resizing
      # and appending to a list of all images.
      def loop_body(i, encoded_images, images):
        encoded_image = encoded_images[i]
        image = tf.image.decode_jpeg(encoded_image, channels=3)
        resized_image = tf.image.resize_images(image, thumbnail_dims)
        expanded_image = tf.expand_dims(resized_image, 0)
        images = tf.cond(
            tf.equal(i, 0), lambda: expanded_image,
            lambda: tf.concat([images, expanded_image], 0))
        return i + 1, encoded_images, images

      loop_out = tf.while_loop(
          lambda i, encoded_images, images: tf.less(i, num_examples),
          loop_body, [i, encoded_images, images],
          shape_invariants=[
              i.get_shape(),
              encoded_images.get_shape(),
              tf.TensorShape(None)
          ])

      # Create the single sprite atlas image from these thumbnails.
      sprite = generate_image_from_thubnails(loop_out[2], thumbnail_dims)
      return sprite.eval()
