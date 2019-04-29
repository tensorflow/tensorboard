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
"""Test utils for mesh plugin tests."""
from __future__ import absolute_import
from __future__ import division
from __future__ import google_type_annotations
from __future__ import print_function

import collections
import json
import threading
import numpy as np
import tensorflow as tf
from google3.third_party.tensorboard.compat.proto import event_pb2
from google3.third_party.tensorboard.compat.proto import graph_pb2
from google3.third_party.tensorboard.compat.proto import meta_graph_pb2
from google3.third_party.tensorboard.compat.proto import summary_pb2
from google3.third_party.tensorboard.util import tb_logging

Mesh = collections.namedtuple('Mesh', ('vertices', 'faces', 'colors'))
logger = tb_logging.get_logger()


# NOTE: copy FileWriter and FileWriterCache from tensorboard test_util.py
# until this plugin start live in TensorBoard github repo.
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
      tf_session_log = tf.compat.v1.SessionLog.FromString(
          session_log.SerializeToString())
    else:
      logger.warn('Added TensorFlow session_log proto. '
                  'Please prefer TensorBoard copy of the proto')
      tf_session_log = session_log
    super(FileWriter, self).add_session_log(tf_session_log, global_step)

  def add_graph(self, graph, global_step=None, graph_def=None):
    if isinstance(graph_def, graph_pb2.GraphDef):
      tf_graph_def = tf.compat.v1.GraphDef.FromString(
          graph_def.SerializeToString())
    else:
      tf_graph_def = graph_def

    super(FileWriter, self).add_graph(
        graph, global_step=global_step, graph_def=tf_graph_def)

  def add_meta_graph(self, meta_graph_def, global_step=None):
    if isinstance(meta_graph_def, meta_graph_pb2.MetaGraphDef):
      tf_meta_graph_def = tf.compat.v1.MetaGraphDef.FromString(
          meta_graph_def.SerializeToString())
    else:
      tf_meta_graph_def = meta_graph_def

    super(FileWriter, self).add_meta_graph(
        meta_graph_def=tf_meta_graph_def, global_step=global_step)


class FileWriterCache(object):
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
            logdir, graph=tf.compat.v1.get_default_graph())
      return FileWriterCache._cache[logdir]


def get_random_mesh(num_vertices,
                    add_faces=False,
                    add_colors=False,
                    batch_size=1):
  """Returns a random point cloud, optionally with random disconnected faces.

  Args:
    num_vertices: Number of vertices in the point cloud or mesh.
    add_faces: Random faces will be generated and added to the mesh when True.
    add_colors: Random colors will be assigned to each vertex when True. Each
      color will be in a range of [0, 255].
    batch_size: Size of batch dimension in output array.

  Returns:
    Mesh namedtuple with vertices and optionally with faces and/or colors.
  """
  vertices = np.random.random([num_vertices, 3]) * 1000
  # Add batch dimension.
  vertices = np.tile(vertices, [batch_size, 1, 1])
  faces = None
  colors = None
  if add_faces:
    arranged_vertices = np.random.permutation(num_vertices)
    faces = []
    for i in range(num_vertices - 2):
      faces.append([
          arranged_vertices[i], arranged_vertices[i + 1],
          arranged_vertices[i + 2]
      ])
    faces = np.array(faces)
    faces = np.tile(faces, [batch_size, 1, 1]).astype(np.int32)
  if add_colors:
    colors = np.random.randint(low=0, high=255, size=[num_vertices, 3])
    colors = np.tile(colors, [batch_size, 1, 1]).astype(np.uint8)
  return Mesh(vertices.astype(np.float32), faces, colors)


def deserialize_json_response(byte_content):
  """Deserializes byte content that is a JSON encoding.

  Args:
    byte_content: The byte content of a response.

  Returns:
    The deserialized python object decoded from JSON.
  """
  return json.loads(byte_content.decode('utf-8'))


def deserialize_array_buffer_response(byte_content, data_type):
  """Deserializes arraybuffer response and optionally tiles the array.

  Args:
    byte_content: The byte content of a response.
    data_type: Numpy type to parse data with.

  Returns:
    Flat numpy array with the data.
  """
  return np.frombuffer(byte_content, dtype=data_type)