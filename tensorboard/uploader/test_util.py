"""Utilities for testing."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import threading

import grpc

from google.protobuf import timestamp_pb2
from tensorboard.compat.proto import summary_pb2


class FakeTime(object):
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
  metadata = summary_pb2.SummaryMetadata(display_name=display_name)
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
