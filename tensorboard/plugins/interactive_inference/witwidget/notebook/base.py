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
import os
import logging
import tensorflow as tf
from IPython import display
from google.protobuf import json_format
from numbers import Number
from six import ensure_str
from six import integer_types
from tensorboard.plugins.interactive_inference.utils import inference_utils

# Constants used in mutant inference generation.
NUM_MUTANTS_TO_GENERATE = 10
NUM_EXAMPLES_FOR_MUTANT_ANALYSIS = 50

# Custom user agent for tracking number of calls to Cloud AI Platform.
USER_AGENT_FOR_CAIP_TRACKING = 'WhatIfTool'

class WitWidgetBase(object):
  """WIT widget base class for common code between Jupyter and Colab."""

  def __init__(self, config_builder):
    """Constructor for WitWidgetBase.

    Args:
      config_builder: WitConfigBuilder object containing settings for WIT.
    """
    tf.get_logger().setLevel(logging.WARNING)
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

    self.custom_predict_fn = config.get('custom_predict_fn')
    self.compare_custom_predict_fn = config.get('compare_custom_predict_fn')
    self.custom_distance_fn = config.get('custom_distance_fn')
    self.adjust_prediction_fn = config.get('adjust_prediction')
    self.compare_adjust_prediction_fn = config.get('compare_adjust_prediction')
    self.adjust_example_fn = config.get('adjust_example')
    self.compare_adjust_example_fn = config.get('compare_adjust_example')
    self.adjust_attribution_fn = config.get('adjust_attribution')
    self.compare_adjust_attribution_fn = config.get('compare_adjust_attribution')

    if 'custom_predict_fn' in copied_config:
      del copied_config['custom_predict_fn']
    if 'compare_custom_predict_fn' in copied_config:
      del copied_config['compare_custom_predict_fn']
    if 'custom_distance_fn' in copied_config:
      del copied_config['custom_distance_fn']
      copied_config['uses_custom_distance_fn'] = True
    if 'adjust_prediction' in copied_config:
      del copied_config['adjust_prediction']
    if 'compare_adjust_prediction' in copied_config:
      del copied_config['compare_adjust_prediction']
    if 'adjust_example' in copied_config:
      del copied_config['adjust_example']
    if 'compare_adjust_example' in copied_config:
      del copied_config['compare_adjust_example']
    if 'adjust_attribution' in copied_config:
      del copied_config['adjust_attribution']
    if 'compare_adjust_attribution' in copied_config:
      del copied_config['compare_adjust_attribution']

    self.config = copied_config
    self.set_examples(config['examples'])
    del copied_config['examples']


    # If using AI Platform for prediction, set the correct custom prediction
    # functions.
    if self.config.get('use_aip'):
      self.custom_predict_fn = self._predict_aip_model
    if self.config.get('compare_use_aip'):
      self.compare_custom_predict_fn = self._predict_aip_compare_model

    # If using JSON input (not Example protos) and a custom predict
    # function, then convert examples to JSON before sending to the
    # custom predict function.
    if self.config.get('uses_json_input'):
      if self.custom_predict_fn is not None and not self.config.get('use_aip'):
        user_predict = self.custom_predict_fn
        def wrapped_custom_predict_fn(examples):
          return user_predict(self._json_from_tf_examples(examples))
        self.custom_predict_fn = wrapped_custom_predict_fn
      if (self.compare_custom_predict_fn is not None and
          not self.config.get('compare_use_aip')):
        compare_user_predict = self.compare_custom_predict_fn
        def wrapped_compare_custom_predict_fn(examples):
          return compare_user_predict(self._json_from_tf_examples(examples))
        self.compare_custom_predict_fn = wrapped_compare_custom_predict_fn

  def _get_element_html(self):
    return """
      <link rel="import" href="/nbextensions/wit-widget/wit_jupyter.html">"""

  def set_examples(self, examples):
    """Sets the examples shown in WIT.

    The examples are initially set by the examples specified in the config
    builder during construction. This method can change which examples WIT
    displays.
    """
    if self.config.get('uses_json_input'):
      tf_examples = self._json_to_tf_examples(examples)
      self.examples = [json_format.MessageToJson(ex) for ex in tf_examples]
    else:
      self.examples = [json_format.MessageToJson(ex) for ex in examples]
    self.updated_example_indices = set(range(len(examples)))

  def compute_custom_distance_impl(self, index, params=None):
    exs_for_distance = [
        self.json_to_proto(example) for example in self.examples]
    selected_ex = exs_for_distance[index]
    return self.custom_distance_fn(selected_ex, exs_for_distance, params)

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
    extra_output_objs = []
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
    (predictions, extra_output) = (
      inference_utils.run_inference_for_inference_results(
        examples_to_infer, serving_bundle))
    infer_objs.append(predictions)
    extra_output_objs.append(extra_output)
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
      (predictions, extra_output) = (
        inference_utils.run_inference_for_inference_results(
          examples_to_infer, serving_bundle))
      infer_objs.append(predictions)
      extra_output_objs.append(extra_output)
    self.updated_example_indices = set()
    return {
      'inferences': {'indices': indices_to_infer, 'results': infer_objs},
      'label_vocab': self.config.get('label_vocab'),
      'extra_outputs': extra_output_objs}

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

  def sort_eligible_features_impl(self, info):
    """Returns sorted list of interesting features for mutant inference."""
    features_list = info['features']
    chart_data = {}
    for feat in features_list:
      chart_data[feat['name']] = self.infer_mutants_impl({
        'x_min': feat['observedMin'] if 'observedMin' in feat else 0,
        'x_max': feat['observedMax'] if 'observedMin' in feat else 0,
        'feature_index_pattern': None,
        'feature_name': feat['name'],
        'example_index': info['example_index'],
      })
    return inference_utils.sort_eligible_features(
      features_list, chart_data)

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
      encoded = ensure_str(base64.b64encode(
        inference_utils.create_sprite_image(example_strings)))
      return 'data:image/png;base64,{}'.format(encoded)
    else:
      return None

  def _json_from_tf_examples(self, tf_examples):
    json_exs = []
    feature_names = self.config.get('feature_names')
    for ex in tf_examples:
      # Create a JSON list or dict for each example depending on settings.
      # Strip out any explicitly-labeled target feature from the example.
      # This is needed because AI Platform models that accept JSON cannot handle
      # when non-input features are provided as part of the object to run
      # prediction on.
      if self.config.get('uses_json_list'):
        json_ex = []
        for feat in ex.features.feature:
          if feature_names and feat in feature_names:
            feat_idx = feature_names.index(feat)
          else:
            feat_idx = int(feat)
          if (feat == self.config.get('target_feature') or
              feat_idx == self.config.get('target_feature')):
            continue
          # Ensure the example value list is long enough to add the next feature
          # from the tf.Example.
          if feat_idx >= len(json_ex):
            json_ex.extend([None] * (feat_idx - len(json_ex) + 1))
          if ex.features.feature[feat].HasField('int64_list'):
            json_ex[feat_idx] = ex.features.feature[feat].int64_list.value[0]
          elif ex.features.feature[feat].HasField('float_list'):
            json_ex[feat_idx] = ex.features.feature[feat].float_list.value[0]
          else:
            json_ex[feat_idx] = ensure_str(
              ex.features.feature[feat].bytes_list.value[0])
      else:
        json_ex = {}
        for feat in ex.features.feature:
          if feat == self.config.get('target_feature'):
            continue
          if ex.features.feature[feat].HasField('int64_list'):
            json_ex[feat] = ex.features.feature[feat].int64_list.value[0]
          elif ex.features.feature[feat].HasField('float_list'):
            json_ex[feat] = ex.features.feature[feat].float_list.value[0]
          else:
            json_ex[feat] = ensure_str(
              ex.features.feature[feat].bytes_list.value[0])
      json_exs.append(json_ex)
    return json_exs

  def _json_to_tf_examples(self, examples):
    def add_single_feature(feat, value, ex):
      if isinstance(value, integer_types):
        ex.features.feature[feat].int64_list.value.append(value)
      elif isinstance(value, Number):
        ex.features.feature[feat].float_list.value.append(value)
      else:
        ex.features.feature[feat].bytes_list.value.append(value.encode('utf-8'))

    tf_examples = []
    for json_ex in examples:
      ex = tf.train.Example()
      # JSON examples can be lists of values (for xgboost models for instance),
      # or dicts of key/value pairs.
      if self.config.get('uses_json_list'):
        feature_names = self.config.get('feature_names')
        for (i, value) in enumerate(json_ex):
          # If feature names have been provided, use those feature names instead
          # of list indices for feature name when storing as tf.Example.
          if feature_names and len(feature_names) > i:
            feat = feature_names[i]
          else:
            feat = str(i)
          add_single_feature(feat, value, ex)
        tf_examples.append(ex)
      else:
        for feat in json_ex:
          add_single_feature(feat, json_ex[feat], ex)
        tf_examples.append(ex)
    return tf_examples

  def _predict_aip_model(self, examples):
    return self._predict_aip_impl(
      examples, self.config.get('inference_address'),
      self.config.get('model_name'), self.config.get('model_signature'),
      self.config.get('force_json_input'), self.adjust_example_fn,
      self.adjust_prediction_fn, self.adjust_attribution_fn,
      self.config.get('aip_service_name'), self.config.get('aip_service_version'))

  def _predict_aip_compare_model(self, examples):
    return self._predict_aip_impl(
      examples, self.config.get('inference_address_2'),
      self.config.get('model_name_2'), self.config.get('model_signature_2'),
      self.config.get('compare_force_json_input'),
      self.compare_adjust_example_fn,
      self.compare_adjust_prediction_fn,
      self.compare_adjust_attribution_fn,
      self.config.get('compare_aip_service_name'),
      self.config.get('compare_aip_service_version'))

  def _predict_aip_impl(self, examples, project, model, version, force_json,
                        adjust_example, adjust_prediction, adjust_attribution,
                        service_name, service_version):
    """Custom prediction function for running inference through AI Platform."""

    # Set up environment for GCP call for specified project.
    os.environ['GOOGLE_CLOUD_PROJECT'] = project

    service = googleapiclient.discovery.build(
      service_name, service_version, cache_discovery=False)
    name = 'projects/{}/models/{}'.format(project, model)
    if version is not None:
      name += '/versions/{}'.format(version)

    # Properly package the examples to send for prediction.
    if self.config.get('uses_json_input') or force_json:
      examples_for_predict = self._json_from_tf_examples(examples)
    else:
      examples_for_predict = [{'b64': base64.b64encode(
        example.SerializeToString()).decode('utf-8') }
        for example in examples]

    # If there is a user-specified input example adjustment to make, make it.
    if adjust_example:
      examples_for_predict = [
        adjust_example(ex) for ex in examples_for_predict]

    # Send request, including custom user-agent for tracking.
    request_builder = service.projects().predict(
        name=name,
        body={'instances': examples_for_predict}
    )
    user_agent = request_builder.headers.get('user-agent')
    request_builder.headers['user-agent'] = (
      USER_AGENT_FOR_CAIP_TRACKING + ('-' + user_agent if user_agent else ''))
    response = request_builder.execute()

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
    results = []
    attributions = (response['attributions']
      if 'attributions' in response else None)

    # If an attribution adjustment function was provided, use it to adjust
    # the attributions.
    if attributions is not None and adjust_attribution is not None:
      attributions = [adjust_attribution(attr) for attr in attributions]

    for pred in response['predictions']:
      # If the prediction contains a key to fetch the prediction, use it.
      if isinstance(pred, dict):
        pred = pred[results_key]
      # If the model is regression and the response is a list, extract the
      # score by taking the first element.
      if (self.config.get('model_type') == 'regression' and
          isinstance(pred, list)):
        pred = pred[0]
      # If an prediction adjustment function was provided, use it to adjust
      # the prediction.
      if adjust_prediction:
        pred = adjust_prediction(pred)
      results.append(pred)
    return {'predictions': results, 'attributions': attributions}

  def create_selection_callback(self, examples, max_examples):
    """Returns an example selection callback for use with TFMA.

    The returned function can be provided as an event handler for a TFMA
    visualization to dynamically load examples matching a selected slice into
    WIT.

    Args:
      examples: A list of tf.Examples to filter and use with WIT.
      max_examples: The maximum number of examples to create.
    """
    def handle_selection(selected):
      def extract_values(feat):
        if feat.HasField('bytes_list'):
          return feat.bytes_list.value
        elif feat.HasField('int64_list'):
          return feat.int64_list.value
        elif feat.HasField('float_list'):
          return feat.float_list.value
        return None

      filtered_examples = []
      for ex in examples:
        if selected['sliceName'] == 'Overall':
          filtered_examples.append(ex)
        else:
          values = extract_values(ex.features.feature[selected['sliceName']])
          if selected['sliceValue'] in values:
            filtered_examples.append(ex)
        if len(filtered_examples) == max_examples:
          break

      self.set_examples(filtered_examples)
    return handle_selection
