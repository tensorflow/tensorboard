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


import threading

import tensorflow as tf

from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import meta_graph_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()


class FileWriter(tf.compat.v1.summary.FileWriter):
    """FileWriter for test.

    TensorFlow FileWriter uses TensorFlow's Protobuf Python binding
    which is largely discouraged in TensorBoard. We do not want a
    TB.Writer but require one for testing in integrational style
    (writing out event files and use the real event readers).
    """

    def __init__(self, *args, **kwargs):
        # Briefly enter graph mode context so this testing FileWriter can be
        # created from an eager mode context without triggering a usage error.
        with tf.compat.v1.Graph().as_default():
            super().__init__(*args, **kwargs)

    def add_test_summary(self, tag, simple_value=1.0, step=None):
        """Convenience for writing a simple summary for a given tag."""
        value = summary_pb2.Summary.Value(tag=tag, simple_value=simple_value)
        summary = summary_pb2.Summary(value=[value])
        self.add_summary(summary, global_step=step)

    def add_event(self, event):
        if isinstance(event, event_pb2.Event):
            tf_event = tf.compat.v1.Event.FromString(event.SerializeToString())
        else:
            tf_event = event
            if not isinstance(event, bytes):
                logger.error(
                    "Added TensorFlow event proto. "
                    "Please prefer TensorBoard copy of the proto"
                )
        super().add_event(tf_event)

    def add_summary(self, summary, global_step=None):
        if isinstance(summary, summary_pb2.Summary):
            tf_summary = tf.compat.v1.Summary.FromString(
                summary.SerializeToString()
            )
        else:
            tf_summary = summary
            if not isinstance(summary, bytes):
                logger.error(
                    "Added TensorFlow summary proto. "
                    "Please prefer TensorBoard copy of the proto"
                )
        super().add_summary(tf_summary, global_step)

    def add_session_log(self, session_log, global_step=None):
        if isinstance(session_log, event_pb2.SessionLog):
            tf_session_log = tf.compat.v1.SessionLog.FromString(
                session_log.SerializeToString()
            )
        else:
            tf_session_log = session_log
            if not isinstance(session_log, bytes):
                logger.error(
                    "Added TensorFlow session_log proto. "
                    "Please prefer TensorBoard copy of the proto"
                )
        super().add_session_log(tf_session_log, global_step)

    def add_graph(self, graph, global_step=None, graph_def=None):
        if isinstance(graph_def, graph_pb2.GraphDef):
            tf_graph_def = tf.compat.v1.GraphDef.FromString(
                graph_def.SerializeToString()
            )
        else:
            tf_graph_def = graph_def

        super().add_graph(
            graph, global_step=global_step, graph_def=tf_graph_def
        )

    def add_meta_graph(self, meta_graph_def, global_step=None):
        if isinstance(meta_graph_def, meta_graph_pb2.MetaGraphDef):
            tf_meta_graph_def = tf.compat.v1.MetaGraphDef.FromString(
                meta_graph_def.SerializeToString()
            )
        else:
            tf_meta_graph_def = meta_graph_def

        super().add_meta_graph(
            meta_graph_def=tf_meta_graph_def, global_step=global_step
        )


class FileWriterCache:
    """Cache for TensorBoard test file writers."""

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
                    logdir, graph=tf.compat.v1.get_default_graph()
                )
            return FileWriterCache._cache[logdir]


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


def ensure_tb_summary_proto(summary):
    """Ensures summary is TensorBoard Summary proto.

    TB v1 summary API returns TF Summary proto. To make test for v1 and
    v2 API congruent, one can use this API to convert result of v1 API
    to TB Summary proto.
    """
    if isinstance(summary, summary_pb2.Summary):
        return summary

    return summary_pb2.Summary.FromString(summary.SerializeToString())
