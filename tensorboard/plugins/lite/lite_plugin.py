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
import os
from werkzeug import wrappers
import traceback

from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.backend.event_processing import plugin_event_accumulator as pec  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.lite import lite_backend

_PLUGIN_PREFIX_ROUTE = 'lite'


class LitePlugin(base_plugin.TBPlugin):
  """A plugin that serves PR curves for individual classes."""

  plugin_name = _PLUGIN_PREFIX_ROUTE

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
        '/list_supported_ops': self.list_supported_ops,
        '/list_saved_models': self.list_saved_models,
        '/convert': self.convert,
        '/script': self.script
    }

  def is_active(self):
    """The graphs plugin is active iff any run has a graph."""
    if not self._multiplexer:
      return False
    # Should contains some runs.
    run_names = [name for (name, data) in self._multiplexer.Runs().items() if data.get(pec.GRAPH)]
    return any(run_names)


  @wrappers.Request.application
  def script(self, request):
    tf.compat.v1.logging.info('run script preview, request: %s', request)

    tflite_output_dir = os.path.join(self._logdir, "tflite_output")
    lite_backend.safe_makedirs(tflite_output_dir)

    result = {}
    tflite_file = os.path.join(tflite_output_dir, "model.tflite")
    script = ""

    # Options has a format of:
    # {
    #     "input_arrays": [],
    #     "output_arrays": [],
    #     "batch_size": 1,
    #     "checkpoint": ""
    # }
    options = json.loads(request.form['data'])

    saved_model_dir = os.path.join(self._logdir, options['saved_model'] or "")
    input_arrays = options['input_arrays'] or []
    output_arrays = options['output_arrays'] or []

    script = lite_backend.script_from_saved_model(saved_model_dir, tflite_file, input_arrays, output_arrays)

    return http_util.Respond(request, json.dumps(script), 'application/json')

  @wrappers.Request.application
  def convert(self, request):
    tf.compat.v1.logging.info('run convert, request: %s', request)

    tflite_output_dir = os.path.join(self._logdir, "tflite_output")
    lite_backend.safe_makedirs(tflite_output_dir)

    result = {}
    tflite_file = os.path.join(tflite_output_dir, "model.tflite")
    script = ""

    options = json.loads(request.form['data'])

    saved_model_dir = os.path.join(self._logdir, options['saved_model'] or "")
    input_arrays = options['input_arrays'] or []
    output_arrays = options['output_arrays'] or []

    script = lite_backend.script_from_saved_model(saved_model_dir, tflite_file, input_arrays, output_arrays)
    success, stdout, stderr = lite_backend.execute(script, verbose=True)

    if success:
      result['result'] = 'success'
      result['tabs'] = [
        {
          'name': 'summary',
          'content': [
            {
              'type': 'text',
              'body': 'Succuss: The model has been converted to tflite file.\n' + stdout
            },
            {
              'type': 'code',
              'body': tflite_file
            }]
        },
        {
          'name': 'command',
          'content': [
            {
              'type': 'code',
              'body': script
            }
          ]
        }
      ]
    else:
      e = lite_backend.ConvertError(stderr)
      error_info = lite_backend.get_exception_info(e)

      result['result'] = 'failed'
      result['tabs'] = [
        {
          'name': 'error',
          'content': [
            {
              'type': 'code',
              'title': 'error',
              'body': '%s: %s' % (error_info['type'], error_info['error'])
            },
          ]
        },
        {
          'name': 'stack trace',
          'content': [
            {
              'type': 'code',
              'body': error_info['stack_trace']
            }
          ]
        }
      ]

      if error_info['suggestion'] is not None:
        result['tabs'][0]['content'].append({
            'type': 'text',
            'title': 'Suggestion',
            'body': '%s' % error_info['suggestion']
          })

      if script is not None:
        result['tabs'].append({
          "name": "command",
          "content": [
            {
              "type": "code",
              "body": script
            }
          ]
        })

      issue_url = lite_backend.ISSUE_LINK
      if issue_url in error_info['error']:
        result['addons'] = [{
          'type': 'link',
          'title': 'Create a github issue',
          'body': issue_url
        }]

    return http_util.Respond(request, json.dumps(result), 'application/json')

  @wrappers.Request.application
  def list_saved_models(self, request):
    tf.compat.v1.logging.info('list_saved_models, request: %s', request)
    saved_models = lite_backend.get_saved_model_dirs(self._logdir)
    return http_util.Respond(request, json.dumps(saved_models), 'application/json')

  @wrappers.Request.application
  def list_supported_ops(self, request):
    tf.compat.v1.logging.info('list_supported_ops, request: %s', request)
    supported_ops = lite_backend.get_potentially_supported_ops()
    return http_util.Respond(request, supported_ops, 'application/json')