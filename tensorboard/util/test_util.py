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

"""TensorBoard testing helper routine module.

This module is basically a dumpster for really generic succinct helper
routines that exist solely for test code.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import threading
import unittest

import tensorflow as tf
# See discussion on issue #1996 for private module import justification.
from tensorflow.python import tf2 as tensorflow_python_tf2

from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import meta_graph_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()


class FileWriter(tf.compat.v1.summary.FileWriter):
  """FileWriter for test.

  TensorFlow FileWriter uses TensorFlow's Protobuf Python binding which is
  largely discouraged in TensorBoard. We do not want a TB.Writer but require one
  for testing in integrational style (writing out event files and use the real
  event readers).
  """

  def add_event(self, event):
    if isinstance(event, event_pb2.Event):
      tf_event = tf.compat.v1.Event.FromString(event.SerializeToString())
    else:
      logger.warn('Added TensorFlow event proto. '
                      'Please prefer TensorBoard copy of the proto')
      tf_event = event
    super(FileWriter, self).add_event(tf_event)

  def add_summary(self, summary, global_step=None):
    if isinstance(summary, summary_pb2.Summary):
      tf_summary = tf.compat.v1.Summary.FromString(summary.SerializeToString())
    else:
      logger.warn('Added TensorFlow summary proto. '
                      'Please prefer TensorBoard copy of the proto')
      tf_summary = summary
    super(FileWriter, self).add_summary(tf_summary, global_step)

  def add_session_log(self, session_log, global_step=None):
    if isinstance(session_log, event_pb2.SessionLog):
      tf_session_log = tf.compat.v1.SessionLog.FromString(session_log.SerializeToString())
    else:
      logger.warn('Added TensorFlow session_log proto. '
                      'Please prefer TensorBoard copy of the proto')
      tf_session_log = session_log
    super(FileWriter, self).add_session_log(tf_session_log, global_step)

  def add_graph(self, graph, global_step=None, graph_def=None):
    if isinstance(graph_def, graph_pb2.GraphDef):
      tf_graph_def = tf.compat.v1.GraphDef.FromString(graph_def.SerializeToString())
    else:
      tf_graph_def = graph_def

    super(FileWriter, self).add_graph(graph, global_step=global_step, graph_def=tf_graph_def)

  def add_meta_graph(self, meta_graph_def, global_step=None):
    if isinstance(meta_graph_def, meta_graph_pb2.MetaGraphDef):
      tf_meta_graph_def = tf.compat.v1.MetaGraphDef.FromString(meta_graph_def.SerializeToString())
    else:
      tf_meta_graph_def = meta_graph_def

    super(FileWriter, self).add_meta_graph(meta_graph_def=tf_meta_graph_def, global_step=global_step)


class FileWriterCache(object):
  """Cache for TensorBoard test file writers.
  """
  # Cache, keyed by directory.
  _cache = {}

  # Lock protecting _FILE_WRITERS.
  _lock = threading.RLock()

  @staticmethod
  def get(logdir):
    """Returns the FileWriter for the specified directory.

    Args:
      logdir: str, name of the directory.

    Returns:
      A `FileWriter`.
    """
    with FileWriterCache._lock:
      if logdir not in FileWriterCache._cache:
        FileWriterCache._cache[logdir] = FileWriter(
            logdir, graph=tf.compat.v1.get_default_graph())
      return FileWriterCache._cache[logdir]


def ensure_tb_summary_proto(summary):
  """Ensures summary is TensorBoard Summary proto.

  TB v1 summary API returns TF Summary proto. To make test for v1 and v2 API
  congruent, one can use this API to convert result of v1 API to TB Summary
  proto.
  """
  if isinstance(summary, summary_pb2.Summary):
    return summary

  return summary_pb2.Summary.FromString(summary.SerializeToString())


def _run_conditionally(guard, name, default_reason=None):
  """Create a decorator factory that skips a test when guard returns False.

    The factory raises ValueError when default_reason is None and reason is not
    passed to the factory.

    Args:
      guard: A lambda that returns True if a test should be executed.
      name: A human readable name for the decorator for an error message.
      default_reason: A string describing why a test should be skipped. If it
          is None, the decorator will make sure the reason is supplied by the
          consumer of the decorator. Default is None.

    Raises:
      ValueError when both reason and default_reason are None.

    Returns:
      A function that returns a decorator.
    """

  def _impl(reason=None):
    if reason is None:
      if default_reason is None:
        raise ValueError('%s requires a reason for skipping.' % name)
      reason = default_reason
    return unittest.skipUnless(guard(), reason)

  return _impl

run_v1_only = _run_conditionally(
    lambda: not tensorflow_python_tf2.enabled(),
    name='run_v1_only')
run_v2_only = _run_conditionally(
    lambda: tensorflow_python_tf2.enabled(),
    name='run_v2_only',
    default_reason='Test only appropriate for TensorFlow v2')
