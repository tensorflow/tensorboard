# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for list_metric_evals."""


from unittest import mock

import tensorflow as tf

from google.protobuf import text_format
from tensorboard import context
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import list_metric_evals
from tensorboard.plugins.scalar import scalars_plugin


class ListMetricEvalsTest(tf.test.TestCase):
    def setUp(self):
        self._mock_scalars_plugin = mock.create_autospec(
            scalars_plugin.ScalarsPlugin
        )
        self._mock_scalars_plugin.scalars_impl.side_effect = (
            self._mock_scalars_impl
        )

    def _mock_scalars_impl(self, ctx, tag, run, experiment, output_format):
        del experiment  # unused
        self.assertIsInstance(ctx, context.RequestContext)
        self.assertEqual("metric_tag", tag)
        self.assertEqual("/this/is/a/session/metric_group", run)
        self.assertEqual(scalars_plugin.OutputFormat.JSON, output_format)
        return ([(1, 1, 1.0), (2, 2, 2.0), (3, 3, 3.0)]), "application/json"

    def _run_handler(self, request):
        request_proto = api_pb2.ListMetricEvalsRequest()
        text_format.Merge(request, request_proto)
        handler = list_metric_evals.Handler(
            context.RequestContext(),
            request_proto,
            self._mock_scalars_plugin,
            "exp_id",
        )
        return handler.run()

    def test_run(self):
        result = self._run_handler(
            """
            session_name: '/this/is/a/session'
            metric_name: {
              tag: 'metric_tag'
              group: 'metric_group'
            }
            """
        )
        self.assertEqual([(1, 1, 1.0), (2, 2, 2.0), (3, 3, 3.0)], result)


if __name__ == "__main__":
    tf.test.main()
