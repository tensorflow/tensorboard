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
"""The plugin serving the inference tab."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from werkzeug import wrappers

from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin

from tensorboard.plugins.inference.utils import common_utils
from tensorboard.plugins.inference.utils import inference_utils
from tensorboard.plugins.inference.utils import oss_utils


# Max number of examples to scan along the `examples_path` in order to return
# statistics and sampling for features.
NUM_EXAMPLES_TO_SCAN = 50

# Max number of mutants to show per feature (i.e. num of points along x-axis).
NUM_MUTANTS = 10


class InferencePlugin(base_plugin.TBPlugin):
  """Plugin for understanding/debugging model inference.
  """

  # This string field is used by TensorBoard to generate the paths for routes
  # provided by this plugin. It must thus be URL-friendly. This field is also
  # used to uniquely identify this plugin throughout TensorBoard. See BasePlugin
  # for details.
  plugin_name = 'inference'

  def __init__(self, context):
    """Constructs an inference plugin for TensorBoard.

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
    # Example: http://localhost:6006/data/plugin/inference/infer_mutants
    return {
        '/infer_mutants': self._infer_mutants_handler,
        '/eligible_features': self._eligible_features_from_example_handler,
        '/example_from_path': self._example_from_path_handler
    }

  def is_active(self):
    """Determines whether this plugin is active.

    Returns:
      A boolean. Whether this plugin is active.
    """
    # TODO(b/69305872): Maybe enable if config flags were specified?
    return False

  @wrappers.Request.application
  def _eligible_features_from_example_handler(self, request):
    """Returns a list of JSON objects for each feature in the example.

    Args:
      request: A request that should contain 'examples_path'.

    Returns:
      A list with a JSON object for each feature.
      Numeric features are represented as {name: observedMin: observedMax:}.
      Categorical features are repesented as {name: samples:[]}.
    """
    examples_path = request.args.get('examples_path')
    try:
      oss_utils.throw_if_file_access_not_allowed(examples_path,
                                                 self._logdir,
                                                 self._has_auth_group)
      features_dict = (
          inference_utils.get_numeric_features_to_observed_range(
              examples_path, NUM_EXAMPLES_TO_SCAN))

      features_dict.update(
          inference_utils.get_categorical_features_to_sampling(
              examples_path, NUM_EXAMPLES_TO_SCAN, NUM_MUTANTS))

      # Massage the features_dict into a sorted list before returning because
      # Polymer dom-repeat needs a list.
      features_list = []
      for k, v in sorted(features_dict.items()):
        v['name'] = k
        features_list.append(v)

      return http_util.Respond(request, features_list, 'application/json')
    except common_utils.InvalidUserInputError as e:
      return http_util.Respond(request, {'error': e.message},
                               'application/json')

  @wrappers.Request.application
  def _example_from_path_handler(self, request):
    """Returns a pretty-printed string of the tf.train.Example.

    Args:
      request: A request that should contain 'examples_path' and 'example_index'
        (a 0-indexed number to indicate an example within examples_path).

    Returns:
      A pretty formatted string of the first tf.train.Example in the path.
    """
    examples_path = request.args.get('examples_path')
    try:
      oss_utils.throw_if_file_access_not_allowed(examples_path,
                                                 self._logdir,
                                                 self._has_auth_group)
      [example] = oss_utils.example_protos_from_path(
          examples_path,
          num_examples=1,
          start_index=int(request.args.get('example_index', '0')))
      return http_util.Respond(request, {'example_contents': str(example)},
                               'application/json')
    except common_utils.InvalidUserInputError as e:
      return http_util.Respond(request, {'error': e.message},
                               'application/json')

  @wrappers.Request.application
  def _infer_mutants_handler(self, request):
    """Returns JSON for the `vz-line-chart`s for a feature.

    Args:
      request: A request that should contain 'feature_name', 'examples_path',
        'example_index', 'inference_address', and 'model_name'.

    Returns:
      A list of JSON objects, one for each chart.
    """
    try:
      if request.method != 'GET':
        tf.logging.error('%s requests are forbidden.', request.method)
        return wrappers.Response(status=405)

      feature_name = request.args.get('feature_name')
      examples_path = request.args.get('examples_path')
      [example] = oss_utils.example_protos_from_path(
          examples_path,
          num_examples=1,
          start_index=int(request.args.get('example_index', '0')))
      serving_bundle = inference_utils.ServingBundle(
          request.args.get('inference_address'), request.args.get('model_name'),
          request.args.get('model_type'))
      viz_params = inference_utils.VizParams(
          request.args.get('x_min'), request.args.get('x_max'), examples_path,
          NUM_EXAMPLES_TO_SCAN, NUM_MUTANTS,
          request.args.get('feature_index_pattern'))
      json_mapping = inference_utils.mutant_charts_for_feature(
          example, feature_name, serving_bundle, viz_params)
      return http_util.Respond(request, json_mapping, 'application/json')
    except common_utils.InvalidUserInputError as e:
      return http_util.Respond(request, {'error': e.message},
                               'application/json')
