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
"""Tests for TensorBoard interactive_inference_plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os
import sys
if sys.version_info.major == 2:
  import mock  # pylint: disable=g-import-not-at-top,unused-import
else:
  from unittest import mock  # pylint: disable=g-import-not-at-top
import mock
import numpy as np
from six.moves import urllib_parse

import tensorflow as tf

from google.protobuf import json_format
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin

from tensorboard.plugins.interactive_inference.utils import inference_utils
from tensorboard.plugins.interactive_inference.utils import platform_utils
from tensorboard.plugins.interactive_inference.utils import test_utils
from tensorboard.plugins.interactive_inference import interactive_inference_plugin

from tensorflow_serving.apis import regression_pb2

class InferencePluginTest(tf.test.TestCase):

  def setUp(self):
    self.logdir = tf.test.get_temp_dir()

    self.context = base_plugin.TBContext(logdir=self.logdir)
    self.plugin = interactive_inference_plugin.InteractiveInferencePlugin(
        self.context)
    wsgi_app = application.TensorBoardWSGIApp(
        self.logdir, [self.plugin],
        multiplexer=event_multiplexer.EventMultiplexer({}),
        reload_interval=0,
        path_prefix='')
    self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)

  def get_fake_example(self, single_int_value=0):
    example = tf.train.Example()
    example.features.feature['single_int'].int64_list.value.extend(
        [single_int_value])
    return example

  def test_examples_from_path(self):
    examples = [self.get_fake_example(0), self.get_fake_example(1)]
    examples_path = os.path.join(self.logdir, 'test_examples.rio')
    test_utils.write_out_examples(examples, examples_path)

    response = self.server.get(
        '/data/plugin/whatif/examples_from_path?' +
        urllib_parse.urlencode({
            'examples_path': examples_path,
            'max_examples': 2,
            'sampling_odds': 1,
        }))
    self.assertEqual(200, response.status_code)
    example_strings = json.loads(response.get_data().decode('utf-8'))['examples']
    received_examples = [json.loads(x) for x in example_strings]
    self.assertEqual(2, len(received_examples))
    self.assertEqual(0,
                     int(received_examples[0]['features']['feature'][
                         'single_int']['int64List']['value'][0]))
    self.assertEqual(1,
                     int(received_examples[1]['features']['feature'][
                         'single_int']['int64List']['value'][0]))

  def test_examples_from_path_if_path_does_not_exist(self):
    response = self.server.get(
        '/data/plugin/whatif/examples_from_path?' +
        urllib_parse.urlencode({
            'examples_path': 'does_not_exist',
            'max_examples': 2,
            'sampling_odds': 1,
        }))
    error = json.loads(response.get_data().decode('utf-8'))['error']
    self.assertTrue(error)

  def test_update_example(self):
    self.plugin.examples = [tf.train.Example()]
    example = self.get_fake_example()
    response = self.server.post(
        '/data/plugin/whatif/update_example',
        data=dict(example=json_format.MessageToJson(example), index='0'))
    self.assertEqual(200, response.status_code)
    self.assertEqual(example, self.plugin.examples[0])
    self.assertTrue(0 in self.plugin.updated_example_indices)

  def test_update_example_invalid_index(self):
    self.plugin.examples = [tf.train.Example()]
    example = self.get_fake_example()
    response = self.server.post(
        '/data/plugin/whatif/update_example',
        data=dict(example=json_format.MessageToJson(example), index='1'))
    error = json.loads(response.get_data().decode('utf-8'))['error']
    self.assertTrue(error)

  @mock.patch.object(platform_utils, 'call_servo')
  def test_infer(self, mock_call_servo):
    self.plugin.examples = [
        self.get_fake_example(0),
        self.get_fake_example(1),
        self.get_fake_example(2)
    ]
    self.plugin.updated_example_indices = set([0, 2])

    inference_result_proto = regression_pb2.RegressionResponse()
    regression = inference_result_proto.result.regressions.add()
    regression.value = 0.45
    regression = inference_result_proto.result.regressions.add()
    regression.value = 0.55
    mock_call_servo.return_value = inference_result_proto

    response = self.server.get(
        '/data/plugin/whatif/infer?' + urllib_parse.urlencode({
            'inference_address': 'addr',
            'model_name': 'name',
            'model_type': 'regression'
        }))

    self.assertEqual(200, response.status_code)
    self.assertEqual(0, len(self.plugin.updated_example_indices))
    inferences = json.loads(json.loads(response.get_data().decode('utf-8'))[
        'inferences'])
    self.assertTrue(0 in inferences['indices'])
    self.assertFalse(1 in inferences['indices'])
    self.assertTrue(2 in inferences['indices'])

  def _DeserializeResponse(self, byte_content):
    """Deserializes byte content that is a JSON encoding.

    Args:
      byte_content: The byte content of a JSON response.

    Returns:
      The deserialized python object decoded from JSON.
    """
    return json.loads(byte_content.decode('utf-8'))

  def test_eligible_features_from_example_proto(self):
    example = test_utils.make_fake_example(single_int_val=2)
    self.plugin.examples = [example]

    response = self.server.get('/data/plugin/whatif/eligible_features')
    self.assertEqual(200, response.status_code)

    # Returns a list of dict objects that have been sorted by feature_name.
    data = self._DeserializeResponse(response.get_data())

    sorted_feature_names = [
        'non_numeric', 'repeated_float', 'repeated_int', 'single_float',
        'single_int'
    ]
    self.assertEqual(sorted_feature_names, [d['name'] for d in data])
    np.testing.assert_almost_equal([-1, 1., 10, 24.5, 2.],
                                   [d.get('observedMin', -1) for d in data])
    np.testing.assert_almost_equal([-1, 4., 20, 24.5, 2.],
                                   [d.get('observedMax', -1) for d in data])

    # Test that only non_numeric feature has samples.
    self.assertFalse(any(d.get('samples') for d in data[1:]))
    self.assertEqual(['cat'], data[0]['samples'])

  @mock.patch.object(inference_utils, 'mutant_charts_for_feature')
  def test_infer_mutants_handler(self, mock_mutant_charts_for_feature):

    # A no-op that just passes the example passed to mutant_charts_for_feature
    # back through. This tests that the URL parameters get processed properly
    # within infer_mutants_handler.
    def pass_through(example, feature_name, serving_bundle, viz_params):
      return {
          'example': str(example),
          'feature_name': feature_name,
          'serving_bundle': {
              'inference_address': serving_bundle.inference_address,
              'model_name': serving_bundle.model_name,
              'model_type': serving_bundle.model_type
          },
          'viz_params': {
              'x_min': viz_params.x_min,
              'x_max': viz_params.x_max
          }
      }

    mock_mutant_charts_for_feature.side_effect = pass_through

    example = test_utils.make_fake_example()
    self.plugin.examples = [example]

    response = self.server.get(
        '/data/plugin/whatif/infer_mutants?' + urllib_parse.urlencode({
            'feature_name': 'single_int',
            'model_name': '/ml/cassandrax/iris_classification',
            'inference_address': 'ml-serving-temp.prediction',
            'model_type': 'classification',
            'x_min': '-10',
            'x_max': '10',
        }))
    result = self._DeserializeResponse(response.get_data())
    self.assertEqual(str(example), result['example'])
    self.assertEqual('single_int', result['feature_name'])
    self.assertEqual('ml-serving-temp.prediction',
                     result['serving_bundle']['inference_address'])
    self.assertEqual('/ml/cassandrax/iris_classification',
                     result['serving_bundle']['model_name'])
    self.assertEqual('classification', result['serving_bundle']['model_type'])
    self.assertAlmostEqual(-10, result['viz_params']['x_min'])
    self.assertAlmostEqual(10, result['viz_params']['x_max'])


if __name__ == '__main__':
  tf.test.main()
