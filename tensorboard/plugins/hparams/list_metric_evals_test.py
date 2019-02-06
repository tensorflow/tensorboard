"""Tests for list_metric_evals."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from google.protobuf import text_format
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import list_metric_evals
from tensorboard.plugins.scalar import scalars_plugin


class ListMetricEvalsTest(tf.test.TestCase):

  def setUp(self):
    self._mock_scalars_plugin = tf.test.mock.create_autospec(
        scalars_plugin.ScalarsPlugin)
    self._mock_scalars_plugin.scalars_impl.side_effect = self._mock_scalars_impl

  def _mock_scalars_impl(self, tag, run, experiment, output_format):
    del experiment  # unused
    self.assertEqual('metric_tag', tag)
    self.assertEqual('/this/is/a/session/metric_group', run)
    self.assertEqual(scalars_plugin.OutputFormat.JSON, output_format)
    return ([(1, 1, 1.0), (2, 2, 2.0), (3, 3, 3.0)]), 'application/json'

  def _run_handler(self, request):
    request_proto = api_pb2.ListMetricEvalsRequest()
    text_format.Merge(request, request_proto)
    handler = list_metric_evals.Handler(
        request_proto, self._mock_scalars_plugin)
    return handler.run()

  def test_run(self):
    result = self._run_handler(
        '''session_name: '/this/is/a/session'
           metric_name: {
             tag: 'metric_tag'
             group: 'metric_group'
           }''')
    self.assertEqual([(1, 1, 1.0), (2, 2, 2.0), (3, 3, 3.0)], result)


if __name__ == '__main__':
  tf.test.main()
