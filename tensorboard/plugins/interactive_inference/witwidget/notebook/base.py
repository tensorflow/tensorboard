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

import base64
import json
import googleapiclient.discovery
import tensorflow as tf
import sys
from IPython import display
from google.protobuf import json_format
from tensorboard.plugins.interactive_inference.utils import inference_utils

# Constants used in mutant inference generation.
NUM_MUTANTS_TO_GENERATE = 10
NUM_EXAMPLES_FOR_MUTANT_ANALYSIS = 50


class WitWidgetBase(object):
  """WIT widget base class for common code between Jupyter and Colab."""

  def __init__(self, config_builder):
    """Constructor for WitWidgetBase.

    Args:
      config_builder: WitConfigBuilder object containing settings for WIT.
    """
    tf.logging.set_verbosity(tf.logging.WARN)
    config = config_builder.build()
    copied_config = dict(config)
    self.estimator_and_spec = (
      dict(config.get('estimator_and_spec'))
      if 'estimator_and_spec' in config else {})
    self.compare_estimator_and_spec = (
      dict(config.get('compare_estimator_and_spec'))
      if 'compare_estimator_and_spec' in config else {})
    if 'estimator_and_spec' in copied_config:
      del copied_config['estimator_and_spec']
    if 'compare_estimator_and_spec' in copied_config:
      del copied_config['compare_estimator_and_spec']

    self.custom_predict_fn = (
      config.get('custom_predict_fn')
      if 'custom_predict_fn' in config else None)
    self.compare_custom_predict_fn = (
      config.get('compare_custom_predict_fn')
      if 'compare_custom_predict_fn' in config else None)
    if 'custom_predict_fn' in copied_config:
      del copied_config['custom_predict_fn']
    if 'compare_custom_predict_fn' in copied_config:
      del copied_config['compare_custom_predict_fn']

    self._set_examples(config['examples'])
    del copied_config['examples']

    self.config = copied_config

    # If using CMLE for prediction, set the correct custom prediction functions.
    if self.config.get('use_cmle'):
      self.custom_predict_fn = self._predict_cmle_model
    if self.config.get('use_cmle_compare'):
      self.compare_custom_predict_fn = self._predict_cmle_compare_model

  def _get_element_html(self):
    return """
      <link rel="import" href="/nbextensions/wit-widget/wit_jupyter.html">"""

  def _set_examples(self, examples):
    self.examples = [json_format.MessageToJson(ex) for ex in examples]
    self.updated_example_indices = set(range(len(examples)))

  def json_to_proto(self, json):
    ex = (tf.train.SequenceExample()
          if self.config.get('are_sequence_examples')
          else tf.train.Example())
    json_format.Parse(json, ex)
    return ex

  def infer_impl(self):
    """Performs inference on examples that require inference."""
    indices_to_infer = sorted(self.updated_example_indices)
    examples_to_infer = [
        self.json_to_proto(self.examples[index]) for index in indices_to_infer]
    infer_objs = []
    serving_bundle = inference_utils.ServingBundle(
      self.config.get('inference_address'),
      self.config.get('model_name'),
      self.config.get('model_type'),
      self.config.get('model_version'),
      self.config.get('model_signature'),
      self.config.get('uses_predict_api'),
      self.config.get('predict_input_tensor'),
      self.config.get('predict_output_tensor'),
      self.estimator_and_spec.get('estimator'),
      self.estimator_and_spec.get('feature_spec'),
      self.custom_predict_fn)
    infer_objs.append(inference_utils.run_inference_for_inference_results(
        examples_to_infer, serving_bundle))
    if ('inference_address_2' in self.config or
        self.compare_estimator_and_spec.get('estimator') or
        self.compare_custom_predict_fn):
      serving_bundle = inference_utils.ServingBundle(
        self.config.get('inference_address_2'),
        self.config.get('model_name_2'),
        self.config.get('model_type'),
        self.config.get('model_version_2'),
        self.config.get('model_signature_2'),
        self.config.get('uses_predict_api'),
        self.config.get('predict_input_tensor'),
        self.config.get('predict_output_tensor'),
        self.compare_estimator_and_spec.get('estimator'),
        self.compare_estimator_and_spec.get('feature_spec'),
        self.compare_custom_predict_fn)
      infer_objs.append(inference_utils.run_inference_for_inference_results(
          examples_to_infer, serving_bundle))
    self.updated_example_indices = set()
    self.inferences = {
      'inferences': {'indices': indices_to_infer, 'results': infer_objs},
      'label_vocab': self.config.get('label_vocab')}

  def infer_mutants_impl(self, info):
    """Performs mutant inference on specified examples."""
    example_index = int(info['example_index'])
    feature_name = info['feature_name']
    examples = (self.examples if example_index == -1
                else [self.examples[example_index]])
    examples = [self.json_to_proto(ex) for ex in examples]
    scan_examples = [self.json_to_proto(ex) for ex in self.examples[0:50]]
    serving_bundles = []
    serving_bundles.append(inference_utils.ServingBundle(
      self.config.get('inference_address'),
      self.config.get('model_name'),
      self.config.get('model_type'),
      self.config.get('model_version'),
      self.config.get('model_signature'),
      self.config.get('uses_predict_api'),
      self.config.get('predict_input_tensor'),
      self.config.get('predict_output_tensor'),
      self.estimator_and_spec.get('estimator'),
      self.estimator_and_spec.get('feature_spec'),
      self.custom_predict_fn))
    if ('inference_address_2' in self.config or
        self.compare_estimator_and_spec.get('estimator') or
        self.compare_custom_predict_fn):
      serving_bundles.append(inference_utils.ServingBundle(
        self.config.get('inference_address_2'),
        self.config.get('model_name_2'),
        self.config.get('model_type'),
        self.config.get('model_version_2'),
        self.config.get('model_signature_2'),
        self.config.get('uses_predict_api'),
        self.config.get('predict_input_tensor'),
        self.config.get('predict_output_tensor'),
        self.compare_estimator_and_spec.get('estimator'),
        self.compare_estimator_and_spec.get('feature_spec'),
        self.compare_custom_predict_fn))
    viz_params = inference_utils.VizParams(
      info['x_min'], info['x_max'],
      scan_examples, 10,
      info['feature_index_pattern'])
    return inference_utils.mutant_charts_for_feature(
      examples, feature_name, serving_bundles, viz_params)

  def get_eligible_features_impl(self):
    """Returns information about features eligible for mutant inference."""
    examples = [self.json_to_proto(ex) for ex in self.examples[
      0:NUM_EXAMPLES_FOR_MUTANT_ANALYSIS]]
    return inference_utils.get_eligible_features(
      examples, NUM_MUTANTS_TO_GENERATE)

  def create_sprite(self):
    """Returns an encoded image of thumbnails for image examples."""
    # Generate a sprite image for the examples if the examples contain the
    # standard encoded image feature.
    if not self.examples:
      return None
    example_to_check = self.json_to_proto(self.examples[0])
    feature_list = (example_to_check.context.feature
                    if self.config.get('are_sequence_examples')
                    else example_to_check.features.feature)
    if 'image/encoded' in feature_list:
      example_strings = [
        self.json_to_proto(ex).SerializeToString()
        for ex in self.examples]
      encoded = base64.b64encode(
        inference_utils.create_sprite_image(example_strings))
      if sys.version_info >= (3, 0):
        encoded = encoded.decode('utf-8')
      return 'data:image/png;base64,{}'.format(encoded)
    else:
      return None

  def _json_from_tf_examples(self, tf_examples):
    json_exs = []
    for ex in tf_examples:
      json_ex = {}
      # Strip out any explicitly-labeled target feature from the example.
      # This is needed because CMLE models that accept JSON cannot handle when
      # non-input features are provided as part of the object to run prediction
      # on.
      for feat in ex.features.feature:
        if feat == self.config.get('target_feature'):
          continue
        if ex.features.feature[feat].HasField('int64_list'):
          json_ex[feat] = ex.features.feature[feat].int64_list.value[0]
        elif ex.features.feature[feat].HasField('float_list'):
          json_ex[feat] = ex.features.feature[feat].float_list.value[0]
        else:
          json_ex[feat] = ex.features.feature[feat].bytes_list.value[0]
      json_exs.append(json_ex)
    return json_exs

  def _predict_cmle_model(self, examples):
    return self._predict_cmle_impl(
      examples, self.config.get('inference_address'),
      self.config.get('model_name'), self.config.get('model_signature'))

  def _predict_cmle_compare_model(self, examples):
    return self._predict_cmle_impl(
      examples, self.config.get('inference_address_2'),
      self.config.get('model_name_2'), self.config.get('model_signature_2'))

  def _predict_cmle_impl(self, examples, project, model, version):
    """Custom prediction function for running inference through CMLE."""
    service = googleapiclient.discovery.build('ml', 'v1', cache_discovery=False)
    name = 'projects/{}/models/{}'.format(project, model)
    if version is not None:
      name += '/versions/{}'.format(version)

    # Properly package the examples to send for prediction.
    if self.config.get('uses_json_input'):
      examples_for_predict = self._json_from_tf_examples(examples)
    else:
      examples_for_predict = [{'b64': base64.b64encode(
        example.SerializeToString()).decode('utf-8') }
        for example in examples]

    response = service.projects().predict(
        name=name,
        body={'instances': examples_for_predict}
    ).execute()
    if 'error' in response:
      raise RuntimeError(response['error'])

    # Get the key to extract the prediction results from.
    results_key = self.config.get('predict_output_tensor')
    if results_key is None:
      if self.config.get('model_type') == 'classification':
        results_key = 'probabilities'
      else:
        results_key = 'outputs'

    # Parse the results from the response and return them.
    if self.config.get('model_type') == 'classification':
      return [pred[results_key] for pred in response['predictions']]
    else:
      # For regression models, flatten the final dimension as WIT expects
      # a 1-D list of numbers for results from all predicted examples.
      return [pred[results_key][0] for pred in response['predictions']]
