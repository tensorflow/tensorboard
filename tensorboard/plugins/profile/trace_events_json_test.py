# -*- coding: utf-8 -*-
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
# ==============================================================================
"""Tests the Trace -> catapult JSON conversion."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import tensorflow as tf

from google.protobuf import text_format
from tensorboard.plugins.profile import trace_events_json
from tensorboard.plugins.profile import trace_events_pb2


class TraceEventsJsonStreamTest(tf.test.TestCase):

  def convert(self, proto_text):
    proto = trace_events_pb2.Trace()
    text_format.Merge(proto_text, proto)
    return json.loads(''.join(trace_events_json.TraceEventsJsonStream(proto)))

  def testJsonConversion(self):
    self.assertEqual(
        self.convert("""
            devices { key: 2 value {
              name: 'D2'
              device_id: 2
              resources { key: 2 value {
                resource_id: 2
                name: 'R2.2'
              } }
            } }
            devices { key: 1 value {
              name: 'D1'
              device_id: 1
              resources { key: 2 value {
                resource_id: 1
                name: 'R1.2'
              } }
            } }

            trace_events {
              device_id: 1
              resource_id: 2
              name: "E1.2.1"
              timestamp_ps: 100000
              duration_ps: 10000
            }
            trace_events {
              device_id: 2
              resource_id: 2
              name: "E2.2.1"
              timestamp_ps: 105000
            }
            """),
        dict(
            displayTimeUnit='ns',
            metadata={'highres-ticks': True},
            traceEvents=[
                dict(ph='M', pid=1, name='process_name', args=dict(name='D1')),
                dict(
                    ph='M',
                    pid=1,
                    name='process_sort_index',
                    args=dict(sort_index=1)),
                dict(
                    ph='M',
                    pid=1,
                    tid=2,
                    name='thread_name',
                    args=dict(name='R1.2')),
                dict(
                    ph='M',
                    pid=1,
                    tid=2,
                    name='thread_sort_index',
                    args=dict(sort_index=2)),
                dict(ph='M', pid=2, name='process_name', args=dict(name='D2')),
                dict(
                    ph='M',
                    pid=2,
                    name='process_sort_index',
                    args=dict(sort_index=2)),
                dict(
                    ph='M',
                    pid=2,
                    tid=2,
                    name='thread_name',
                    args=dict(name='R2.2')),
                dict(
                    ph='M',
                    pid=2,
                    tid=2,
                    name='thread_sort_index',
                    args=dict(sort_index=2)),
                dict(ph='X', pid=1, tid=2, name='E1.2.1', ts=0.1, dur=0.01),
                dict(ph='i', pid=2, tid=2, name='E2.2.1', ts=0.105, s='t'),
                {},
            ]))


if __name__ == '__main__':
  tf.test.main()
