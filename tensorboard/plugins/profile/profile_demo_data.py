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
"""Demo data for the profile dashboard"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

RUNS = ['foo', 'bar']


TRACES = {}


TRACES['foo'] = """
devices { key: 2 value {
  name: 'Foo2'
  device_id: 2
  resources { key: 2 value {
    resource_id: 2
    name: 'R2.2'
  } }
} }
devices { key: 1 value {
  name: 'Foo1'
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
  timestamp_ps: 100
  duration_ps: 10
}
trace_events {
  device_id: 2
  resource_id: 2
  name: "E2.2.1"
  timestamp_ps: 90
  duration_ps: 40
}
"""


TRACES['bar'] = """
devices { key: 2 value {
  name: 'Bar2'
  device_id: 2
  resources { key: 2 value {
    resource_id: 2
    name: 'R2.2'
  } }
} }
devices { key: 1 value {
  name: 'Bar1'
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
  timestamp_ps: 10
  duration_ps: 1000
}
trace_events {
  device_id: 2
  resource_id: 2
  name: "E2.2.1"
  timestamp_ps: 105
}
"""
