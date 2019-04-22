# -*- coding: utf-8 -*-
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

"""Unit tests for end_to_end_util."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import tensorflow as tf

from tensorboard.plugins.profile import end_to_end_util
from tensorboard.plugins.profile.end_to_end_helper import LogEvent

tf.compat.v1.enable_eager_execution()


# Timing results for a single session (e.g., train, eval, predict). Each
# value is a float representing ms since epoch at which the corresponding
# event occurred.
SessionTiming = collections.namedtuple(
    'SessionTiming',
    [
        'begin',
        'init_system_begin',
        'init_system_end',
        'model_fn_begin',
        'setup_infeed_begin',
        'setup_infeed_end',
        'model_fn_end',
        'end',
    ]
)

def _create_events_within_session(init_system_begin, init_system_end,
                                  model_fn_begin, model_fn_end,
                                  setup_infeed_begin, setup_infeed_end):
  log_events = []
  log_events.append(LogEvent(init_system_begin,
                             'profile/init_system_begin'))
  log_events.append(LogEvent(init_system_end,
                             'profile/init_system_end'))
  log_events.append(LogEvent(model_fn_begin,
                             'profile/model_fn_begin'))
  log_events.append(LogEvent(model_fn_end,
                             'profile/model_fn_end'))
  log_events.append(LogEvent(setup_infeed_begin,
                             'profile/setup_infeed_begin'))
  log_events.append(LogEvent(setup_infeed_end,
                             'profile/setup_infeed_end'))
  return log_events

def _create_test_events(train_timing, eval_timing, predict_timing):

  """Create end-to-end test data with the given timing information.

     Args:
       train_timing: A `SessionTiming` value for the training session.
       eval_timing: A `SessionTiming` value for the evaluation session.
       predict_timing: A `SessionTiming` value for the prediction session.

    Returns:
      A list of `LogEvent` objects.
"""

  log_events = []
  log_events.append(LogEvent(train_timing.begin,
                             'profile/train_begin'))
  log_events.append(LogEvent(train_timing.end,
                             'profile/train_end'))
  train_events = _create_events_within_session(train_timing.init_system_begin,
                                               train_timing.init_system_end,
                                               train_timing.model_fn_begin,
                                               train_timing.model_fn_end,
                                               train_timing.setup_infeed_begin,
                                               train_timing.setup_infeed_end)
  log_events.extend(train_events)
  log_events.append(LogEvent(eval_timing.begin,
                             'profile/eval_begin'))
  log_events.append(LogEvent(eval_timing.end,
                             'profile/eval_end'))
  eval_events = _create_events_within_session(eval_timing.init_system_begin,
                                              eval_timing.init_system_end,
                                              eval_timing.model_fn_begin,
                                              eval_timing.model_fn_end,
                                              eval_timing.setup_infeed_begin,
                                              eval_timing.setup_infeed_end)
  log_events.extend(eval_events)
  log_events.append(LogEvent(predict_timing.begin,
                             'profile/predict_begin'))
  log_events.append(LogEvent(predict_timing.end,
                             'profile/predict_end'))
  predict_events = _create_events_within_session(predict_timing.init_system_begin,
                                                 predict_timing.init_system_end,
                                                 predict_timing.model_fn_begin,
                                                 predict_timing.model_fn_end,
                                                 predict_timing.setup_infeed_begin,
                                                 predict_timing.setup_infeed_end)
  log_events.extend(predict_events)
  return log_events


class EndToEndUtilTest(tf.test.TestCase):
  """Test class for end-to-end util."""

  def test_normal(self):
    # Test the normal situation where train, eval, and predict are
    # executed sequentially.

    def _expected_answer():
      return [['Category',
               "beginning to init-system's start",
               'init-system',
               "init-system's end to model-fn's start",
               'model-fn', 'setup-infeed', 'training',
               "training's end to eval's start", 'eval',
               "eval's end to predict's start", 'predict',
               {'role': 'annotation'}],
              ['', 200, 100, 200, 200, 150,
               9900, 500, 2500, 1000, 4000, '']]

    log_events = _create_test_events(
        SessionTiming(100, 300, 400, 600, 750, 900, 950, 10000),
        SessionTiming(10500, 10600, 10650, 11000, 11700, 12000, 12500, 13000),
        SessionTiming(14000, 14600, 14650, 15000, 15700, 17000, 17200, 18000))
    breakdown = end_to_end_util.EndToEndBreakDown(log_events)
    self.assertEqual(breakdown.output(), _expected_answer())

  def test_eval_overlapped_with_train(self):
    # Test for the case where eval is done in parallel with train.

    def _expected_answer():
      return [['Category',
               "beginning to init-system's start",
               'init-system',
               "init-system's end to model-fn's start",
               'model-fn', 'setup-infeed', 'training',
               "training's end to eval's start", 'eval',
               "eval's end to predict's start",
               'predict', {'role': 'annotation'}],
              ['', 1100, 600, 200, 400, 400,
               9900, 0, 0, 11000, 4000, '']]

    log_events = _create_test_events(
        SessionTiming(100, 300, 400, 600, 750, 900, 950, 10000),
        SessionTiming(1000, 1200, 1800, 2000, 2200, 2600, 2800, 3000),
        SessionTiming(14000, 14600, 14650, 15000, 15700, 17000, 17200, 18000))
    breakdown = end_to_end_util.EndToEndBreakDown(log_events)
    self.assertEqual(breakdown.output(), _expected_answer())

if __name__ == '__main__':
  tf.test.main()
