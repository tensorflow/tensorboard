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
"""Tests for learning.brain.tensorboard.plugins.inference.inference_utils."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import sys

import numpy as np
import tensorflow as tf

try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

from tensorflow_serving.apis import classification_pb2
from tensorflow_serving.apis import predict_pb2
from tensorflow_serving.apis import regression_pb2

from tensorboard.plugins.interactive_inference.witwidget import common_utils
from tensorboard.plugins.interactive_inference.witwidget import inference_utils
from tensorboard.plugins.interactive_inference.witwidget import platform_utils
from tensorboard.plugins.interactive_inference.witwidget import test_utils


class InferenceUtilsTest(tf.test.TestCase):

  def setUp(self):
    self.logdir = tf.test.get_temp_dir()
    self.examples_path = os.path.join(self.logdir, 'example.pb')

  def tearDown(self):
    try:
      os.remove(self.examples_path)
    except EnvironmentError:
      pass

  def make_and_write_fake_example(self):
    """Make example and write it to self.examples_path."""
    example = test_utils.make_fake_example()
    test_utils.write_out_examples([example], self.examples_path)
    return example

  def test_parse_original_feature_from_example(self):
    example = test_utils.make_fake_example()
    original_feature = inference_utils.parse_original_feature_from_example(
        example, 'repeated_float')
    self.assertEqual('repeated_float', original_feature.feature_name)
    self.assertEqual([1.0, 2.0, 3.0, 4.0], original_feature.original_value)
    self.assertEqual('float_list', original_feature.feature_type)
    self.assertEqual(4, original_feature.length)

    original_feature = inference_utils.parse_original_feature_from_example(
        example, 'repeated_int')
    self.assertEqual('repeated_int', original_feature.feature_name)
    self.assertEqual([10, 20], original_feature.original_value)
    self.assertEqual('int64_list', original_feature.feature_type)
    self.assertEqual(2, original_feature.length)

    original_feature = inference_utils.parse_original_feature_from_example(
        example, 'single_int')
    self.assertEqual('single_int', original_feature.feature_name)
    self.assertEqual([0], original_feature.original_value)
    self.assertEqual('int64_list', original_feature.feature_type)
    self.assertEqual(1, original_feature.length)

  def test_example_protos_from_path_get_all_in_file(self):
    cns_path = os.path.join(tf.test.get_temp_dir(),
                            'dummy_example')
    example = test_utils.make_fake_example()
    test_utils.write_out_examples([example], cns_path)
    dummy_examples = platform_utils.example_protos_from_path(cns_path)
    self.assertEqual(1, len(dummy_examples))
    self.assertEqual(example, dummy_examples[0])

  def test_example_protos_from_path_get_two(self):
    cns_path = os.path.join(tf.test.get_temp_dir(),
                            'dummy_example')
    example_one = test_utils.make_fake_example(1)
    example_two = test_utils.make_fake_example(2)
    example_three = test_utils.make_fake_example(3)
    test_utils.write_out_examples([example_one, example_two, example_three],
                                  cns_path)
    dummy_examples = platform_utils.example_protos_from_path(cns_path, 2)
    self.assertEqual(2, len(dummy_examples))
    self.assertEqual(example_one, dummy_examples[0])
    self.assertEqual(example_two, dummy_examples[1])

  def test_example_protos_from_path_use_wildcard(self):
    cns_path = os.path.join(tf.test.get_temp_dir(),
                            'wildcard_example1')
    example1 = test_utils.make_fake_example(1)
    test_utils.write_out_examples([example1], cns_path)
    cns_path = os.path.join(tf.test.get_temp_dir(),
                            'wildcard_example2')
    example2 = test_utils.make_fake_example(2)
    test_utils.write_out_examples([example2], cns_path)

    wildcard_path = os.path.join(tf.test.get_temp_dir(),
                                'wildcard_example*')
    dummy_examples = platform_utils.example_protos_from_path(
        wildcard_path)
    self.assertEqual(2, len(dummy_examples))

  def test_example_proto_from_path_if_does_not_exist(self):
    cns_path = os.path.join(tf.test.get_temp_dir(), 'does_not_exist')
    with self.assertRaises(common_utils.InvalidUserInputError):
      platform_utils.example_protos_from_path(cns_path)

  def test_get_numeric_features(self):
    example = test_utils.make_fake_example(single_int_val=2)
    data = inference_utils.get_numeric_feature_names(example)
    self.assertEqual(
        ['repeated_float', 'repeated_int', 'single_float', 'single_int'], data)

  def test_get_numeric_features_to_observed_range(self):
    example = test_utils.make_fake_example(single_int_val=2)

    data = inference_utils.get_numeric_features_to_observed_range(
        [example])

    # Returns a sorted list by feature_name.
    self.assertDictEqual({
        'repeated_float': {
            'observedMin': 1.,
            'observedMax': 4.,
        },
        'repeated_int': {
            'observedMin': 10,
            'observedMax': 20,
        },
        'single_float': {
            'observedMin': 24.5,
            'observedMax': 24.5,
        },
        'single_int': {
            'observedMin': 2.,
            'observedMax': 2.,
        },
    }, data)

  def test_get_categorical_features_to_sampling(self):
    cat_example = tf.train.Example()
    cat_example.features.feature['non_numeric'].bytes_list.value.extend(
        [b'cat'])

    cow_example = tf.train.Example()
    cow_example.features.feature['non_numeric'].bytes_list.value.extend(
        [b'cow'])

    pony_example = tf.train.Example()
    pony_example.features.feature['non_numeric'].bytes_list.value.extend(
        [b'pony'])

    examples = [cat_example] * 4 + [cow_example] * 5 + [pony_example] * 10

    # If we stop sampling at the first 3 examples, the only example should be
    # cat example.
    data = inference_utils.get_categorical_features_to_sampling(
        examples[0: 3], top_k=1)
    self.assertDictEqual({
        'non_numeric': {
            'samples': [b'cat']
        }
    }, data)

    # If we sample more examples, the top 2 examples should be cow and pony.
    data = inference_utils.get_categorical_features_to_sampling(
        examples[0: 20], top_k=2)
    self.assertDictEqual({
        'non_numeric': {
            'samples': [b'pony', b'cow']
        }
    }, data)

  def test_wrap_inference_results_classification(self):
    """Test wrapping a classification result."""
    inference_result_proto = classification_pb2.ClassificationResponse()
    classification = inference_result_proto.result.classifications.add()
    inference_class = classification.classes.add()
    inference_class.label = 'class_b'
    inference_class.score = 0.3
    inference_class = classification.classes.add()
    inference_class.label = 'class_a'
    inference_class.score = 0.7

    wrapped = inference_utils.wrap_inference_results(inference_result_proto)
    self.assertEqual(1, len(wrapped.classification_result.classifications))
    self.assertEqual(
        2, len(wrapped.classification_result.classifications[0].classes))

  def test_wrap_inference_results_regression(self):
    """Test wrapping a regression result."""
    inference_result_proto = regression_pb2.RegressionResponse()
    regression = inference_result_proto.result.regressions.add()
    regression.value = 0.45
    regression = inference_result_proto.result.regressions.add()
    regression.value = 0.55

    wrapped = inference_utils.wrap_inference_results(inference_result_proto)
    self.assertEqual(2, len(wrapped.regression_result.regressions))

  @mock.patch.object(inference_utils, 'make_json_formatted_for_single_chart')
  @mock.patch.object(platform_utils, 'call_servo')
  def test_mutant_charts_for_feature(self, mock_call_servo,
                                     mock_make_json_formatted_for_single_chart):
    example = self.make_and_write_fake_example()
    serving_bundle = inference_utils.ServingBundle('', '', 'classification',
                                                   '', '', False, '', '')
    num_mutants = 10
    viz_params = inference_utils.VizParams(
        x_min=1,
        x_max=10,
        examples=[example],
        num_mutants=num_mutants,
        feature_index_pattern=None)

    mock_call_servo = lambda _, __: None
    mock_make_json_formatted_for_single_chart = lambda _, __: {}
    charts = inference_utils.mutant_charts_for_feature(
        [example], 'repeated_float', serving_bundle, viz_params)
    self.assertEqual('numeric', charts['chartType'])
    self.assertEqual(4, len(charts['data']))
    charts = inference_utils.mutant_charts_for_feature(
        [example], 'repeated_int', serving_bundle, viz_params)
    self.assertEqual('numeric', charts['chartType'])
    self.assertEqual(2, len(charts['data']))
    charts = inference_utils.mutant_charts_for_feature(
        [example], 'single_int', serving_bundle, viz_params)
    self.assertEqual('numeric', charts['chartType'])
    self.assertEqual(1, len(charts['data']))
    charts = inference_utils.mutant_charts_for_feature(
        [example], 'non_numeric', serving_bundle, viz_params)
    self.assertEqual('categorical', charts['chartType'])
    self.assertEqual(3, len(charts['data']))

  @mock.patch.object(inference_utils, 'make_json_formatted_for_single_chart')
  @mock.patch.object(platform_utils, 'call_servo')
  def test_mutant_charts_for_feature_with_feature_index_pattern(
      self, mock_call_servo, mock_make_json_formatted_for_single_chart):
    example = self.make_and_write_fake_example()
    serving_bundle = inference_utils.ServingBundle('', '', 'classification',
                                                   '', '', False, '', '')
    num_mutants = 10
    viz_params = inference_utils.VizParams(
        x_min=1,
        x_max=10,
        examples=[example],
        num_mutants=num_mutants,
        feature_index_pattern='0 , 2-3')

    mock_call_servo = lambda _, __: None
    mock_make_json_formatted_for_single_chart = lambda _, __: {}
    charts = inference_utils.mutant_charts_for_feature(
        [example], 'repeated_float', serving_bundle, viz_params)
    self.assertEqual('numeric', charts['chartType'])
    self.assertEqual(3, len(charts['data']))

    # These should return 3 charts even though all fields from the index
    # pattern don't exist for the example.
    charts = inference_utils.mutant_charts_for_feature(
        [example], 'repeated_int', serving_bundle, viz_params)
    self.assertEqual('numeric', charts['chartType'])
    self.assertEqual(3, len(charts['data']))

    charts = inference_utils.mutant_charts_for_feature(
        [example], 'single_int', serving_bundle, viz_params)
    self.assertEqual('numeric', charts['chartType'])
    self.assertEqual(3, len(charts['data']))

  def test_make_mutant_tuples_float_list(self):
    example = self.make_and_write_fake_example()
    index_to_mutate = 1
    num_mutants = 10
    viz_params = inference_utils.VizParams(
        x_min=1,
        x_max=10,
        examples = [example],
        num_mutants=num_mutants,
        feature_index_pattern=None)

    original_feature = inference_utils.parse_original_feature_from_example(
        example, 'repeated_float')
    mutant_features, mutant_examples = inference_utils.make_mutant_tuples(
        [example],
        original_feature,
        index_to_mutate=index_to_mutate,
        viz_params=viz_params)

    # Check that values in mutant_features and mutant_examples are as expected.
    expected_values = np.linspace(1, 10, num_mutants)
    np.testing.assert_almost_equal(
        expected_values,
        [mutant_feature.mutant_value for mutant_feature in mutant_features])
    np.testing.assert_almost_equal(expected_values, [
        mutant_example.features.feature['repeated_float']
        .float_list.value[index_to_mutate] for mutant_example in mutant_examples
    ])

    # Check that the example (other than the mutant value) is the same.
    for expected_value, mutant_example in zip(expected_values, mutant_examples):
      mutant_values = test_utils.value_from_example(mutant_example,
                                                    'repeated_float')
      original_values = test_utils.value_from_example(example, 'repeated_float')
      original_values[index_to_mutate] = expected_value
      self.assertEqual(original_values, mutant_values)

  def test_make_mutant_tuples_int_list(self):
    example = self.make_and_write_fake_example()
    index_to_mutate = 1
    num_mutants = 10
    viz_params = inference_utils.VizParams(
        x_min=1,
        x_max=10,
        examples = [example],
        num_mutants=num_mutants,
        feature_index_pattern=None)
    original_feature = inference_utils.parse_original_feature_from_example(
        example, 'repeated_int')
    mutant_features, mutant_examples = inference_utils.make_mutant_tuples(
        [example],
        original_feature,
        index_to_mutate=index_to_mutate,
        viz_params=viz_params)

    # Check that values in mutant_features and mutant_examples are as expected.
    expected_values = np.linspace(1, 10, num_mutants)
    np.testing.assert_almost_equal(
        expected_values,
        [mutant_feature.mutant_value for mutant_feature in mutant_features])
    np.testing.assert_almost_equal(expected_values, [
        mutant_example.features.feature['repeated_int']
        .int64_list.value[index_to_mutate] for mutant_example in mutant_examples
    ])

    # Check that the example (other than the mutant value) is the same.
    for expected_value, mutant_example in zip(expected_values, mutant_examples):
      mutant_values = test_utils.value_from_example(mutant_example,
                                                    'repeated_int')
      original_values = test_utils.value_from_example(example, 'repeated_int')
      original_values[index_to_mutate] = expected_value
      self.assertEqual(original_values, mutant_values)

  def test_make_json_formatted_for_single_chart_classification(self):
    """Test making a classification chart with a single point on it."""
    inference_result_proto = classification_pb2.ClassificationResponse()
    classification = inference_result_proto.result.classifications.add()
    inference_class = classification.classes.add()
    inference_class.label = 'class_a'
    inference_class.score = 0.7

    inference_class = classification.classes.add()
    inference_class.label = 'class_b'
    inference_class.score = 0.3

    original_feature = inference_utils.OriginalFeatureList(
        'feature_name', [2.], 'float_list')
    mutant_feature = inference_utils.MutantFeatureValue(
        original_feature, index=0, mutant_value=20)

    jsonable = inference_utils.make_json_formatted_for_single_chart(
        [mutant_feature], inference_result_proto, 0)

    self.assertEqual(['class_a', 'class_b'], sorted(jsonable.keys()))
    self.assertEqual(1, len(jsonable['class_a']))
    self.assertEqual(20, jsonable['class_a'][0]['step'])
    self.assertAlmostEqual(0.7, jsonable['class_a'][0]['scalar'])

    self.assertEqual(1, len(jsonable['class_b']))
    self.assertEqual(20, jsonable['class_b'][0]['step'])
    self.assertAlmostEqual(0.3, jsonable['class_b'][0]['scalar'])

  def test_make_json_formatted_for_single_chart_regression(self):
    """Test making a regression chart with a single point on it."""
    inference_result_proto = regression_pb2.RegressionResponse()
    regression = inference_result_proto.result.regressions.add()
    regression.value = 0.45

    original_feature = inference_utils.OriginalFeatureList(
        'feature_name', [2.], 'float_list')
    mutant_feature = inference_utils.MutantFeatureValue(
        original_feature, index=0, mutant_value=20)

    jsonable = inference_utils.make_json_formatted_for_single_chart(
        [mutant_feature], inference_result_proto, 0)

    self.assertEqual(['value'], list(jsonable.keys()))
    self.assertEqual(1, len(jsonable['value']))
    self.assertEqual(20, jsonable['value'][0]['step'])
    self.assertAlmostEqual(0.45, jsonable['value'][0]['scalar'])

  def test_convert_predict_response_regression(self):
    """Test converting a PredictResponse to a RegressionResponse."""
    predict = predict_pb2.PredictResponse()
    output = predict.outputs['scores']
    dim = output.tensor_shape.dim.add()
    dim.size = 2
    output.float_val.extend([0.1, 0.2])

    bundle = inference_utils.ServingBundle(
        '', '', 'regression', '', '', True, '', 'scores')
    converted = common_utils.convert_predict_response(predict, bundle)

    self.assertAlmostEqual(0.1, converted.result.regressions[0].value)
    self.assertAlmostEqual(0.2, converted.result.regressions[1].value)

  def test_convert_predict_response_classification(self):
    """Test converting a PredictResponse to a ClassificationResponse."""
    predict = predict_pb2.PredictResponse()
    output = predict.outputs['probabilities']
    dim = output.tensor_shape.dim.add()
    dim.size = 3
    dim = output.tensor_shape.dim.add()
    dim.size = 2
    output.float_val.extend([1., 0., .9, .1, .8, .2])

    bundle = inference_utils.ServingBundle(
        '', '', 'classification', '', '', True, '', 'probabilities')
    converted = common_utils.convert_predict_response(predict, bundle)

    self.assertEqual("0", converted.result.classifications[0].classes[0].label)
    self.assertAlmostEqual(
        1, converted.result.classifications[0].classes[0].score)
    self.assertEqual("1", converted.result.classifications[0].classes[1].label)
    self.assertAlmostEqual(
        0, converted.result.classifications[0].classes[1].score)

    self.assertEqual("0", converted.result.classifications[1].classes[0].label)
    self.assertAlmostEqual(
        .9, converted.result.classifications[1].classes[0].score)
    self.assertEqual("1", converted.result.classifications[1].classes[1].label)
    self.assertAlmostEqual(
        .1, converted.result.classifications[1].classes[1].score)

    self.assertEqual("0", converted.result.classifications[2].classes[0].label)
    self.assertAlmostEqual(
        .8, converted.result.classifications[2].classes[0].score)
    self.assertEqual("1", converted.result.classifications[2].classes[1].label)
    self.assertAlmostEqual(
        .2, converted.result.classifications[2].classes[1].score)


if __name__ == '__main__':
  tf.test.main()
