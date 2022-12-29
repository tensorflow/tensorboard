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
"""Utilities for testing."""


import threading

import grpc

from google.protobuf import timestamp_pb2
from tensorboard.compat.proto import summary_pb2


class FakeTime:
    """Thread-safe fake replacement for the `time` module."""

    def __init__(self, current=0.0):
        self._time = float(current)
        self._lock = threading.Lock()

    def time(self):
        with self._lock:
            return self._time

    def sleep(self, secs):
        with self._lock:
            self._time += secs


def scalar_metadata(display_name):
    """Makes a scalar metadata proto, for constructing expected requests."""
    metadata = summary_pb2.SummaryMetadata(
        display_name=display_name, data_class=summary_pb2.DATA_CLASS_SCALAR
    )
    metadata.plugin_data.plugin_name = "scalars"
    return metadata


def grpc_error(code, details):
    # Monkey patch insertion for the methods a real grpc.RpcError would have.
    error = grpc.RpcError("RPC error %r: %s" % (code, details))
    error.code = lambda: code
    error.details = lambda: details
    return error


def timestamp_pb(nanos):
    result = timestamp_pb2.Timestamp()
    result.FromNanoseconds(nanos)
    return result
