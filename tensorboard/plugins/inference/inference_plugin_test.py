"""Tests for TensorBoard inference_plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os
import mock
import numpy as np
from six.moves import urllib_parse

from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin

from tensorboard.plugins.inference import inference_plugin
from tensorboard.plugins.inference.utils import test_utils


class InferencePluginTest(tf.test.TestCase):

  def setUp(self):
    self.logdir = tf.test.get_temp_dir()

    self.context = base_plugin.TBContext(logdir=self.logdir)
    self.plugin = inference_plugin.InferencePlugin(self.context)
    wsgi_app = application.TensorBoardWSGIApp(
        self.logdir, [self.plugin],
        multiplexer=event_multiplexer.EventMultiplexer({}),
        reload_interval=0,
        path_prefix='')
    self.server = werkzeug_test.Client(wsgi_app, wrappers.BaseResponse)

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
    examples_path = os.path.join(self.logdir, 'test_eligible_features.pb')
    test_utils.write_out_examples([example], examples_path)

    response = self.server.get(
        '/data/plugin/inference/eligible_features?' + urllib_parse.urlencode({
            'examples_path': examples_path
        }))
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
    self.assertEqual([str(['cat', 'woof'])], data[0]['samples'])

  def test_example_from_path(self):
    examples = [test_utils.make_fake_example(i) for i in range(3)]
    examples_path = os.path.join(self.logdir, 'test_example_from_path.pb')
    test_utils.write_out_examples(examples, examples_path)

    example_index = 1
    response = self.server.get(
        '/data/plugin/inference/example_from_path?' + urllib_parse.urlencode({
            'examples_path': examples_path,
            'example_index': example_index
        }))
    self.assertEqual(200, response.status_code)
    returned_string = self._DeserializeResponse(
        response.get_data())['example_contents']
    self.assertEqual(str(examples[example_index]), returned_string)

  def test_example_from_path_if_path_does_not_exist(self):
    response = self.server.get(
        '/data/plugin/inference/example_from_path?' + urllib_parse.urlencode({
            'examples_path': 'does_not_exist'
        }))
    error = self._DeserializeResponse(response.get_data())['error']
    self.assertTrue(error)

  @mock.patch.object(inference_plugin.inference_utils,
                     'mutant_charts_for_feature')
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
    examples_path = os.path.join(self.logdir, 'test_example_from_path.pb')
    test_utils.write_out_examples([example], examples_path)

    response = self.server.get(
        '/data/plugin/inference/infer_mutants?' + urllib_parse.urlencode({
            'examples_path': examples_path,
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
