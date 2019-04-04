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

import tensorflow as tf

from tensorboard.plugins.profile import end_to_end_util


tf.compat.v1.enable_eager_execution()


def _create_events_within_session(init_system_begin, init_system_end,
                                  model_fn_begin, model_fn_end,
                                  setup_infeed_begin, setup_infeed_end):
  log_events = []
  if init_system_begin is not None:
    log_events.append(LogEvent(init_system_begin, 'init_system_begin'))
  if init_system_end is not None:
    log_events.append(LogEvent(init_system_end, 'init_system_end'))
  if model_fn_begin is not None:
    log_events.append(LogEvent(model_fn_begin, 'model_fn_begin'))
  if model_fn_end is not None:
    log_events.append(LogEvent(model_fn_end, 'model_fn_end'))
  if setup_infeed_begin is not None:
    log_events.append(LogEvent(setup_infeed_begin, 'setup_infeed_begin'))
  if setup_infeed_end is not None:
    log_events.append(LogEvent(setup_infeed_end, 'setup_infeed_end'))
  return log_events

def _create_test_events(train_begin,
                        train_init_system_begin,
                        train_init_system_end,
                        train_model_fn_begin,
                        train_model_fn_end,
                        train_setup_infeed_begin,
                        train_setup_infeed_end,
                        train_end,
                        eval_begin,
                        eval_init_system_begin,
                        eval_init_system_end,
                        eval_model_fn_begin,
                        eval_model_fn_end,
                        eval_setup_infeed_begin,
                        eval_setup_infeed_end,
                        eval_end,
                        predict_begin,
                        predict_init_system_begin,
                        predict_init_system_end,
                        predict_model_fn_begin,
                        predict_model_fn_end,
                        predict_setup_infeed_begin,
                        predict_setup_infeed_end,
                        predict_end):
  log_events = []
  if train_begin is not None:
    log_events.append(LogEvent(train_begin, 'train_begin'))
  if train_end is not None:
    log_events.append(LogEvent(train_end, 'train_end'))
  train_events = _create_events_within_session(train_init_system_begin,
                                               train_init_system_end,
                                               train_model_fn_begin,
                                               train_model_fn_end,
                                               train_setup_infeed_begin,
                                               train_setup_infeed_end)
  log_events.extend(train_events)
  if eval_begin is not None:
    log_events.append(LogEvent(eval_begin, 'eval_begin'))
  if eval_end is not None:
    log_events.append(LogEvent(eval_end, 'eval_end'))
  eval_events = _create_events_within_session(eval_init_system_begin,
                                              eval_init_system_end,
                                              eval_model_fn_begin,
                                              eval_model_fn_end,
                                              eval_setup_infeed_begin,
                                              eval_setup_infeed_end)
  log_events.extend(eval_events)

  if predict_begin is not None:
    log_events.append(LogEvent(predict_begin, 'predict_begin'))
  if predict_end is not None:
    log_events.append(LogEvent(predict_end, 'predict_end'))
  predict_events = _create_events_within_session(predict_init_system_begin,
                                                 predict_init_system_end,
                                                 predict_model_fn_begin,
                                                 predict_model_fn_end,
                                                 predict_setup_infeed_begin,
                                                 predict_setup_infeed_end)
  log_events.extend(predict_events)
  return log_events


class LogEvent:
  """Log event format used in end-to-end profiling."""

  def __init__(self, timestamp, event_name):
    self.timestamp = timestamp
    self.attribute = 'profile/' + event_name


class EndToEndUtilTest(tf.test.TestCase):
  """Test class for end-to-end util."""

  def test_Normal(self):
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
        train_begin=100,
        train_init_system_begin=300,
        train_init_system_end=400,
        train_model_fn_begin=600,
        train_setup_infeed_begin=750,
        train_setup_infeed_end=900,
        train_model_fn_end=950,
        train_end=10000,
        eval_begin=10500,
        eval_init_system_begin=10600,
        eval_init_system_end=10650,
        eval_model_fn_begin=11000,
        eval_setup_infeed_begin=11700,
        eval_setup_infeed_end=12000,
        eval_model_fn_end=12500,
        eval_end=13000,
        predict_begin=14000,
        predict_init_system_begin=14600,
        predict_init_system_end=14650,
        predict_model_fn_begin=15000,
        predict_setup_infeed_begin=15700,
        predict_setup_infeed_end=17000,
        predict_model_fn_end=17200,
        predict_end=18000)
    breakdown = end_to_end_util.EndToEndBreakDown(log_events)
    self.assertEqual(breakdown.Output(), _expected_answer())

  def test_EvalOverlappedWithTrain(self):
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
        train_begin=100,
        train_init_system_begin=300,
        train_init_system_end=400,
        train_model_fn_begin=600,
        train_setup_infeed_begin=750,
        train_setup_infeed_end=900,
        train_model_fn_end=950,
        train_end=10000,
        eval_begin=1000,
        eval_init_system_begin=1200,
        eval_init_system_end=1800,
        eval_model_fn_begin=2000,
        eval_setup_infeed_begin=2200,
        eval_setup_infeed_end=2600,
        eval_model_fn_end=2800,
        eval_end=3000,
        predict_begin=14000,
        predict_init_system_begin=14600,
        predict_init_system_end=14650,
        predict_model_fn_begin=15000,
        predict_setup_infeed_begin=15700,
        predict_setup_infeed_end=17000,
        predict_model_fn_end=17200,
        predict_end=18000)

    breakdown = end_to_end_util.EndToEndBreakDown(log_events)
    self.assertEqual(breakdown.Output(), _expected_answer())

if __name__ == '__main__':
  tf.test.main()
