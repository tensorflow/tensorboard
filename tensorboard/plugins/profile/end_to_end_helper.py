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

"""Helper code for testing and using the end-to-end profiler."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os
import tensorflow as tf

from tensorboard.plugins.profile import end_to_end_util

class LogEvent:
  """Log event format used in end-to-end profiling."""
  
  def __init__(self, tf_event):
    #timestamp is in ms.
    self.timestamp = tf_event.wall_time * 1000.0
    self.attribute = tf_event.summary.value[0].tag


def create_end_to_end_json(run_dir, event_filepath):
  """Creates the result JSON file for end-to-end profiling.

  Args:
    run_dir: the directory which will hold the JSON file.
    event_filepath: the path to the TF event file which
                    contain the profile logs.
  Returns:
    Nothing.
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
