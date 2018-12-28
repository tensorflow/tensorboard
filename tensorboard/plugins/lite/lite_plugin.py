# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf
import six
import json
import subprocess
from os import listdir, path, mkdir
from werkzeug import wrappers
import traceback

from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.lite import metadata
from tensorboard.plugins.lite import plugin_data_pb2
from tensorboard.plugins.lite import run_toco_impl
from tensorflow.errors import Suggestion


class LitePlugin(base_plugin.TBPlugin):
  """A plugin that serves PR curves for individual classes."""

  plugin_name = metadata.PLUGIN_NAME

  def __init__(self, context):
    """Instantiates a PrCurvesPlugin.
    Args:
      context: A base_plugin.TBContext instance. A magic container that
        TensorBoard uses to make objects available to the plugin.
    """
    self._db_connection_provider = context.db_connection_provider
    self._multiplexer = context.multiplexer
    self._logdir = context.logdir

  def get_plugin_apps(self):
    """Gets all routes offered by the plugin.

    Returns:
      A dictionary mapping URL path to route that handles it.
    """
    return {
        '/tflite_supported_ops': self.tflite_supported_ops,
        '/checkpoints': self.list_checkpoints,
        '/run_toco': self.run_toco
    }

  def is_active(self):
    """The graphs plugin is active iff any run has a graph."""
    return bool(run_toco_impl.tflite_support and self._multiplexer and [run_name
            for (run_name, run_data) in self._multiplexer.Runs().items()
            if run_data.get(event_accumulator.GRAPH)])

  @wrappers.Request.application
  def run_toco(self, request):
    graph_def_file = path.join(self._logdir, "graph.pbtxt")
    try:
      mkdir(path.join(self._logdir, "tflite_output"))
    except:
      pass

    try:
      result = {}
      tflite_file = path.join(self._logdir, "tflite_output", "model.tflite")

      options = {
          "input_nodes": ["dnn/input_from_feature_columns/input_layer/concat"],
          "output_nodes": ["dnn/head/predictions/probabilities"],
          "batch_size": 1,
          "checkpoint": ""
      }

      options = json.loads(request.form['data'])
      options['checkpoint'] = path.join(self._logdir, options['checkpoint'])

      run_toco_impl.freeze_and_convert(graph_def_file, tflite_file, options)
      result['success'] = ('Convert successfully. TFLite model path is '
                           '{tflite_file}'.format(tflite_file=tflite_file))

    except Exception as e:
      if not isinstance(e, Suggestion):
        traceback.print_stack()
        e = Suggestion(e)

    try:
      script = run_toco_impl.freeze_and_convert(graph_def_file, tflite_file, options)
      result['success'] = {
        'type': 'Success',
        'content': {
          'message': 'Convert successfully. TF Lite model path is: <br/><span id="generated_path">{tflite_file}</a>'.format(tflite_file=tflite_file),
          'shell_script': script
        }
      }
    except Suggestion as e:
      if 'errors' not in result:
        result['errors'] = []
      message = {'type': e.type,  'content': {'message': e.error}}

      if e.suggestion is not None:
        message['content']['suggestion'] = e.suggestion

      if e.stack_trace is not None:
        message['content']['stack_trace'] = e.stack_trace

      result['errors'].append(message)

    print("result: " + json.dumps(result))

    return http_util.Respond(request, json.dumps(result), 'application/json')

  @wrappers.Request.application
  def list_checkpoints(self, request):
    checkpoints = [path.splitext(f)[0] for f in listdir(self._logdir) if '.ckpt' in f and '.meta' in f]
    print("checkpoints:" + json.dumps(checkpoints))
    return http_util.Respond(request, json.dumps(checkpoints), 'application/json')

  @wrappers.Request.application
  def tflite_supported_ops(self, request):
    supported_ops = run_toco_impl.list_supported_ops()
    return http_util.Respond(request, supported_ops, 'application/json')
