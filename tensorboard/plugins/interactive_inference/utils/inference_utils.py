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
"""Shared utils among inference plugins."""

import collections
import copy
import numpy as np
from six import iteritems
from six import string_types
from six.moves import zip  # pylint: disable=redefined-builtin

from tensorboard.plugins.interactive_inference.utils import common_utils
from tensorboard.plugins.interactive_inference.utils import platform_utils
from tensorflow_serving.apis import classification_pb2
from tensorflow_serving.apis import inference_pb2
from tensorflow_serving.apis import regression_pb2


class VizParams(object):
  """Light-weight class for holding UI state.

  Attributes:
    x_min: The minimum value to use to generate mutants for the feature
      (as specified the user on the UI).
    x_max: The maximum value to use to generate mutants for the feature
      (as specified the user on the UI).
    examples: A list of examples to scan in order to generate statistics for
      mutants.
    num_mutants: Int number of mutants to generate per chart.
    feature_index_pattern: String that specifies a restricted set of indices
      of the feature to generate mutants for (useful for features that is a
      long repeated field. See `convert_pattern_to_indices` for more details.
  """

  def __init__(self, x_min, x_max, examples, num_mutants,
               feature_index_pattern):
    """Inits VizParams may raise InvalidUserInputError for bad user inputs."""

    def to_float_or_none(x):
      try:
        return float(x)
      except (ValueError, TypeError):
        return None

    def to_int(x):
      try:
        return int(x)
      except (ValueError, TypeError) as e:
        raise common_utils.InvalidUserInputError(e)

    def convert_pattern_to_indices(pattern):
      """Converts a printer-page-style pattern and returns a list of indices.

      Args:
        pattern: A printer-page-style pattern with only numeric characters,
          commas, dashes, and optionally spaces.

      For example, a pattern of '0,2,4-6' would yield [0, 2, 4, 5, 6].

      Returns:
        A list of indices represented by the pattern.
      """
      pieces = [token.strip() for token in pattern.split(',')]
      indices = []
      for piece in pieces:
        try:
          if '-' in piece:
            lower, upper = [int(x.strip()) for x in piece.split('-')]
            indices.extend(range(lower, upper + 1))
          else:
            indices.append(int(piece.strip()))
        except ValueError as e:
          raise common_utils.InvalidUserInputError(e)
      return sorted(indices)

    self.x_min = to_float_or_none(x_min)
    self.x_max = to_float_or_none(x_max)
    self.examples = examples
    self.num_mutants = to_int(num_mutants)

    # By default, there are no specific user-requested feature indices.
    self.feature_indices = []
    if feature_index_pattern:
      self.feature_indices = convert_pattern_to_indices(feature_index_pattern)


class OriginalFeatureList(object):
  """Light-weight class for holding the original values in the example.

  Should not be created by hand, but rather generated via
  `parse_original_feature_from_example`. Just used to hold inferred info
  about the example.

  Attributes:
    feature_name: String name of the feature.
    original_value: The value of the feature in the original example.
    feature_type: One of ['int64_list', 'float_list'].

  Raises:
    ValueError: If OriginalFeatureList fails init validation.
  """

  def __init__(self, feature_name, original_value, feature_type):
    """Inits OriginalFeatureList."""
    self.feature_name = feature_name
    self.original_value = original_value
    self.feature_type = feature_type

    # Derived attributes.
    self.length = sum(1 for _ in original_value)


class MutantFeatureValue(object):
  """Light-weight class for holding mutated values in the example.

  Should not be created by hand but rather generated via `make_mutant_features`.

  Used to represent a "mutant example": an example that is mostly identical to
  the user-provided original example, but has one feature that is different.

  Attributes:
    original_feature: An `OriginalFeatureList` object representing the feature
      to create mutants for.
    index: The index of the feature to create mutants for. The feature can be
      a repeated field, and we want to plot mutations of its various indices.
    mutant_value: The proposed mutant value for the given index.

  Raises:
    ValueError: If MutantFeatureValue fails init validation.
  """

  def __init__(self, original_feature, index, mutant_value):
    """Inits MutantFeatureValue."""
    if not isinstance(original_feature, OriginalFeatureList):
      raise ValueError(
          'original_feature should be `OriginalFeatureList`, but had '
          'unexpected type: {}'.format(type(original_feature)))
    self.original_feature = original_feature

    if index is not None and not isinstance(index, int):
      raise ValueError(
          'index should be None or int, but had unexpected type: {}'.format(
              type(index)))
    self.index = index
    self.mutant_value = mutant_value


class ServingBundle(object):
  """Light-weight class for holding info to make the inference request.

  Attributes:
    inference_address: A local address or blade address to send inference
      requests to.
    model_name: The Servo model name.
    model_type: One of ['classification', 'regression'].
    model_version: The version number of the model as a string. If set to an
      empty string, the latest model will be used.
    signature: The signature of the model to infer. If set to an empty string,
      the default signuature will be used.

  Raises:
    ValueError: If ServingBundle fails init validation.
  """

  def __init__(self, inference_address, model_name, model_type, model_version,
               signature):
    """Inits ServingBundle."""
    if not isinstance(inference_address, string_types):
      raise ValueError('Invalid inference_address has type: {}'.format(
          type(inference_address)))
    # Clean the inference_address so that SmartStub likes it.
    self.inference_address = inference_address.replace('http://', '').replace(
        'https://', '')

    if not isinstance(model_name, string_types):
      raise ValueError('Invalid model_name has type: {}'.format(
          type(model_name)))
    self.model_name = model_name

    if model_type not in ['classification', 'regression']:
      raise ValueError('Invalid model_type: {}'.format(model_type))
    self.model_type = model_type

    self.model_version = int(model_version) if model_version else None

    self.signature = signature if signature else None


def proto_value_for_feature(example, feature_name):
  """Get the value of a feature from Example regardless of feature type."""
  feature = example.features.feature[feature_name]
  feature_type = feature.WhichOneof('kind')
  if feature_type is None:
    raise ValueError('Feature {} on example proto has no declared type.'.format(
        feature_name))
  return getattr(feature, feature_type).value


def parse_original_feature_from_example(example, feature_name):
  """Returns an `OriginalFeatureList` for the specified feature_name.

  Args:
    example: An example.
    feature_name: A string feature name.

  Returns:
    A filled in `OriginalFeatureList` object representing the feature.
  """
  feature = example.features.feature[feature_name]
  feature_type = feature.WhichOneof('kind')
  original_value = proto_value_for_feature(example, feature_name)

  return OriginalFeatureList(feature_name, original_value, feature_type)


def wrap_inference_results(inference_result_proto):
  """Returns packaged inference results from the provided proto.

  Args:
    inference_result_proto: The classification or regression response proto.

  Returns:
    An InferenceResult proto with the result from the response.
  """
  inference_proto = inference_pb2.InferenceResult()
  if isinstance(inference_result_proto,
                classification_pb2.ClassificationResponse):
    inference_proto.classification_result.CopyFrom(
        inference_result_proto.result)
  elif isinstance(inference_result_proto, regression_pb2.RegressionResponse):
    inference_proto.regression_result.CopyFrom(inference_result_proto.result)
  return inference_proto


def get_numeric_feature_names(example):
  """Returns a list of feature names for float and int64 type features.

  Args:
    example: An example.

  Returns:
    A list of string feature names.
  """
  numeric_features = ('float_list', 'int64_list')
  features = example.features.feature
  return sorted([
      feature_name for feature_name in features
      if features[feature_name].WhichOneof('kind') in numeric_features
  ])


def get_categorical_feature_names(example):
  """Returns a list of feature names for byte type features.

  Args:
    example: An example.

  Returns:
    A list of categorical feature names (e.g. ['education', 'marital_status'] )
  """
  features = example.features.feature
  return sorted([
      feature_name for feature_name in features
      if features[feature_name].WhichOneof('kind') == 'bytes_list'
  ])


def get_numeric_features_to_observed_range(examples):
  """Returns numerical features and their observed ranges.

  Args:
    examples: Examples to read to get ranges.

  Returns:
    A dict mapping feature_name -> {'observedMin': 'observedMax': } dicts,
    with a key for each numerical feature.
  """
  observed_features = collections.defaultdict(list)  # name -> [value, ]
  for example in examples:
    for feature_name in get_numeric_feature_names(example):
      original_feature = parse_original_feature_from_example(
          example, feature_name)
      observed_features[feature_name].extend(original_feature.original_value)
  return {
      feature_name: {
          'observedMin': min(feature_values),
          'observedMax': max(feature_values),
      }
      for feature_name, feature_values in iteritems(observed_features)
  }


def get_categorical_features_to_sampling(examples, top_k):
  """Returns categorical features and a sampling of their most-common values.

  The results of this slow function are used by the visualization repeatedly,
  so the results are cached.

  Args:
    examples: Examples to read to get feature samples.
    top_k: Max number of samples to return per feature.

  Returns:
    A dict of feature_name -> {'samples': ['Married-civ-spouse',
      'Never-married', 'Divorced']}.

    There is one key for each categorical feature.

    Currently, the inner dict just has one key, but this structure leaves room
    for further expansion, and mirrors the structure used by
    `get_numeric_features_to_observed_range`.
  """
  observed_features = collections.defaultdict(list)  # name -> [value, ]
  for example in examples:
    for feature_name in get_categorical_feature_names(example):
      original_feature = parse_original_feature_from_example(
          example, feature_name)
      observed_features[feature_name].extend(original_feature.original_value)

  result = {}
  for feature_name, feature_values in sorted(iteritems(observed_features)):
    samples = [
        word
        for word, count in collections.Counter(feature_values).most_common(
            top_k) if count > 1
    ]
    if samples:
      result[feature_name] = {'samples': samples}
  return result


def make_mutant_features(original_feature, index_to_mutate, viz_params):
  """Return a list of `MutantFeatureValue`s that are variants of original."""
  lower = viz_params.x_min
  upper = viz_params.x_max
  examples = viz_params.examples
  num_mutants = viz_params.num_mutants

  if original_feature.feature_type == 'float_list':
    return [
        MutantFeatureValue(original_feature, index_to_mutate, value)
        for value in np.linspace(lower, upper, num_mutants)
    ]
  elif original_feature.feature_type == 'int64_list':
    mutant_values = np.linspace(int(lower), int(upper),
                                num_mutants).astype(int).tolist()
    # Remove duplicates that can occur due to integer constraint.
    mutant_values = sorted(set(mutant_values))
    return [
        MutantFeatureValue(original_feature, index_to_mutate, value)
        for value in mutant_values
    ]
  elif original_feature.feature_type == 'bytes_list':
    feature_to_samples = get_categorical_features_to_sampling(
        examples, num_mutants)

    # `mutant_values` looks like:
    # [['Married-civ-spouse'], ['Never-married'], ['Divorced'], ['Separated']]
    mutant_values = feature_to_samples[original_feature.feature_name]['samples']
    return [
        MutantFeatureValue(original_feature, None, value)
        for value in mutant_values
    ]
  else:
    raise ValueError('Malformed original feature had type of: ' +
                     original_feature.feature_type)


def make_mutant_tuples(example_proto, original_feature, index_to_mutate,
                       viz_params):
  """Return a list of `MutantFeatureValue`s and a list of mutant Examples.

  Args:
    example_proto: The example to mutate.
    original_feature: A `OriginalFeatureList` that encapsulates the feature to
      mutate.
    index_to_mutate: The index of the int64_list or float_list to mutate.
    viz_params: A `VizParams` object that contains the UI state of the request.

  Returns:
    A list of `MutantFeatureValue`s and a list of mutant examples.
  """
  mutant_features = make_mutant_features(original_feature, index_to_mutate,
                                         viz_params)
  mutant_examples = []
  for mutant_feature in mutant_features:
    copied_example = copy.deepcopy(example_proto)
    feature_name = mutant_feature.original_feature.feature_name

    feature_list = proto_value_for_feature(copied_example, feature_name)
    if index_to_mutate is None:
      new_values = mutant_feature.mutant_value
    else:
      new_values = list(feature_list)
      new_values[index_to_mutate] = mutant_feature.mutant_value

    del feature_list[:]
    feature_list.extend(new_values)
    mutant_examples.append(copied_example)

  return mutant_features, mutant_examples


def mutant_charts_for_feature(example_proto, feature_name, serving_bundle,
                              viz_params):
  """Returns JSON formatted for rendering all charts for a feature.

  Args:
    example_proto: The example proto to mutate.
    feature_name: The string feature name to mutate.
    serving_bundle: A `ServingBundle` object that contains the information to
      make the serving request.
    viz_params: A `VizParams` object that contains the UI state of the request.

  Raises:
    InvalidUserInputError if `viz_params.feature_index_pattern` requests out of
    range indices for `feature_name` within `example_proto`.

  Returns:
    A JSON-able dict for rendering a single mutant chart.  parsed in
    `tf-inference-dashboard.html`.
    {
      'chartType': 'numeric', # oneof('numeric', 'categorical')
      'data': [A list of data] # parseable by vz-line-chart or vz-bar-chart
    }
  """

  def chart_for_index(index_to_mutate):
    mutant_features, mutant_examples = make_mutant_tuples(
        example_proto, original_feature, index_to_mutate, viz_params)

    inference_result_proto = platform_utils.call_servo(
        mutant_examples, serving_bundle)
    return make_json_formatted_for_single_chart(mutant_features,
                                                inference_result_proto,
                                                index_to_mutate)

  try:
    original_feature = parse_original_feature_from_example(
        example_proto, feature_name)
  except ValueError as e:
    return {
        'chartType': 'categorical',
        'data': []
    }

  indices_to_mutate = viz_params.feature_indices or range(
      original_feature.length)
  chart_type = ('categorical' if original_feature.feature_type == 'bytes_list'
                else 'numeric')

  try:
    return {
        'chartType': chart_type,
        'data': [
            chart_for_index(index_to_mutate)
            for index_to_mutate in indices_to_mutate
        ]
    }
  except IndexError as e:
    raise common_utils.InvalidUserInputError(e)


def make_json_formatted_for_single_chart(mutant_features,
                                         inference_result_proto,
                                         index_to_mutate):
  """Returns JSON formatted for a single mutant chart.

  Args:
    mutant_features: An iterable of `MutantFeatureValue`s representing the
      X-axis.
    inference_result_proto: A ClassificationResponse or RegressionResponse
      returned by Servo, representing the Y-axis.
      It contains one 'classification' or 'regression' for everyExample that
      was sent for inference. The length of that field should be the same length
      of mutant_features.
    index_to_mutate: The index of the feature being mutated for this chart.

  Returns:
    A JSON-able dict for rendering a single mutant chart, parseable by
    `vz-line-chart` or `vz-bar-chart`.
  """
  x_label = 'step'
  y_label = 'scalar'
  points = []

  if isinstance(inference_result_proto,
                classification_pb2.ClassificationResponse):
    # classification_label -> [{x_label: y_label:}]
    series = collections.defaultdict(list)

    # ClassificationResponse has a separate probability for each label
    assert len(mutant_features) == len(
        inference_result_proto.result.classifications)
    for mutant_feature, classification in zip(
        mutant_features, inference_result_proto.result.classifications):
      for class_index, classification_class in enumerate(
        classification.classes):
        # Fill in class index when labels are missing
        if classification_class.label == '':
          classification_class.label = str(class_index)
        # Special case to not include the "0" class in binary classification.
        # Since that just results in a chart that is symmetric around 0.5.
        if len(
            classification.classes) == 2 and classification_class.label == '0':
          continue
        key = classification_class.label
        if index_to_mutate:
          key += ' (index %d)' % index_to_mutate
        series[key].append({
            x_label: mutant_feature.mutant_value,
            y_label: classification_class.score,
        })

    # Post-process points to have separate list for each class
    for points in series.values():
      points.sort(key=lambda p: p[x_label])
    return series

  elif isinstance(inference_result_proto, regression_pb2.RegressionResponse):
    assert len(mutant_features) == len(
        inference_result_proto.result.regressions)

    for mutant_feature, regression in zip(
        mutant_features, inference_result_proto.result.regressions):
      points.append({
          x_label: mutant_feature.mutant_value,
          y_label: regression.value
      })
    key = 'value'
    if (index_to_mutate != 0):
      key += ' (index %d)' % index_to_mutate
    return {key: points}

  else:
    raise NotImplementedError('Only classification and regression implemented.')
