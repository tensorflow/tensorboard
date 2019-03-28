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

"""Demo code for using the end-to-end profiler."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os
import shutil
import tempfile
import tensorflow as tf
import time

from tensorboard.plugins.profile import end_to_end_util
from tensorflow.python.platform import gfile
from tensorflow.python.tpu import profile_logger

class LogEvent:
  """Log event format used in end-to-end profiling."""

  def __init__(self, tf_event):
    # timestamp is in ms.
    self.timestamp = tf_event.wall_time * 1000.0
    self.attribute = tf_event.summary.value[0].tag

def _sleep_ms(duration_ms):
  time.sleep(duration_ms / 1000.0)

def _create_event_file(run_dir):
  """Creates an event file in the run_dir/profile

  Args:
    run_dir: the directory which will hold the event file.

  Returns:
    The absolute path to the created event file.
  """
  log_dir = os.path.join(run_dir, 'profile')
  if os.path.isdir(log_dir):
    # Removes the old log dir (if exists).
    shutil.rmtree(log_dir)

  with tf.Session() as sess:
    logger = profile_logger.ProfileLogger(run_dir)
    # Creates fake train, eval, and predict sessions.
    _sleep_ms(10)
    logger.log_event('train', 'begin')
    _sleep_ms(50)
    logger.log_event('init_system', 'begin')
    _sleep_ms(100)
    logger.log_event('init_system', 'end')
    _sleep_ms(150)
    logger.log_event('model_fn', 'begin')
    _sleep_ms(60)
    logger.log_event('setup_infeed', 'begin')
    _sleep_ms(180)
    logger.log_event('setup_infeed', 'end')
    _sleep_ms(30)
    logger.log_event('model_fn', 'end')
    _sleep_ms(100)
    logger.log_event('train', 'end')
    _sleep_ms(25)
    logger.log_event('eval', 'begin')
    _sleep_ms(100)
    logger.log_event('eval', 'end')
    _sleep_ms(10)
    logger.log_event('predict', 'begin')
    _sleep_ms(70)
    logger.log_event('predict', 'end')
  files = gfile.ListDirectory(log_dir)
  event_filepath = None
  for f in sorted(files):
    if '.tfevents.' in f and '.profile_logger' in f:
      event_filepath = os.path.join(log_dir, f)
      break
  assert event_filepath is not None, \
         'event file is not generated'
  event_filepath = os.path.abspath(event_filepath)
  return log_dir, event_filepath


def create_end_to_end_json(event_filepath, run_dir):
  """Creates a JSON file from the given event file.

  Args:
    event_filepath: path to the event file.
    run_dir: the directory in which the JSON file is created.

  Returns:
    Notheing.
  """

  log_events = []
  for e in tf.train.summary_iterator(event_filepath):
    if e.HasField('file_version'):
      continue
    log_events.append(LogEvent(e))
  end_to_end = end_to_end_util.EndToEndBreakDown(log_events)
  json_path = os.path.join(run_dir, 'end_to_end.json')
  with open(json_path, 'w') as f:
    f.write('%s\n'%json.dumps(end_to_end.Json()))
    print('Successfully wrote ', json_path)


def create_demo(run_dir):
  """Creates a demo JSON file for end-to-end profiling.

  Args:
    run_dir: the directory which will hold the JSON file.

  Returns:
    Nothing.
  """

  (log_dir, event_filepath) = _create_event_file(run_dir)
  create_end_to_end_json(event_filepath, run_dir)

  shutil.rmtree(log_dir)
  print('Successfully removed ', log_dir)
