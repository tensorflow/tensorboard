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
"""Functions for dealing with metrics. """

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard.plugins.hparams import api_pb2

def last_metric_eval(multiplexer, session_name, metric_name):
  """Returns the last evaluations of the given metric at the given session.
  Args:
    multiplexer: The EventMultiplexer instance allowing access to
        the exported summary data.
    session_name: String. The session name for which to get the metric
        evaluations.
    metric_name: api_pb2.MetricName proto. The name of the metric to use.

  Returns:
    A 3-tuples, of the form [wall-time, step, value], denoting
    the last evaluation of the metric, where wall-time denotes the wall time
    in seconds since UNIX epoch of the time of the evaluation, step denotes
    the training step at which the model is evaluated, and value denotes the
    (scalar real) value of the metric.

  Raises:
    KeyError if the given session does not have the metric.
  """
  assert isinstance(session_name, str)
  assert isinstance(metric_name, api_pb2.MetricName)
  run = session_name + metric_name.group
  tag = metric_name.tag
  try:
    tensor_events = multiplexer.Tensors(run=run, tag=tag)
  except KeyError as e:
    raise KeyError(
        'Can\'t find metric %s for session: %s. Underlying error message: %s'
        % (metric_name, session_name, e))
  last_event = tensor_events[-1]
  # TODO(erez): Raise HParamsError if the tensor is not a 0-D real scalar.
  return (last_event.wall_time,
          last_event.step,
          tf.make_ndarray(last_event.tensor_proto).item())
