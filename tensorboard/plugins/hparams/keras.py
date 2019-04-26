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
"""Keras integration for TensorBoard hparams.

Most users should use `tensorboard.plugins.hparams.api` to access this
module's contents.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six
import tensorflow as tf

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import summary
from tensorboard.plugins.hparams import summary_v2


class Callback(tf.keras.callbacks.Callback):
  """Callback for logging hyperparameters to TensorBoard.

  NOTE: This callback only works in TensorFlow eager mode.
  """

  def __init__(
      self,
      writer,
      hparams,
      group_name=None,
  ):
    """Create a callback for logging hyperparameters to TensorBoard.

    As with the standard `tf.keras.callbacks.TensorBoard` class, each
    callback object is valid for only one call to `model.fit`.

    Args:
      writer: The `SummaryWriter` object to which hparams should be
        written, or a logdir (as a `str`) to be passed to
        `tf.summary.create_file_writer` to create such a writer.
      logdir: The log directory for this session.
      hparams: A `dict` mapping hyperparameters to the values used in
        this session. Keys should be the names of `HParam` objects used
        in an experiment, or the `HParam` objects themselves. Values
        should be Python `bool`, `int`, `float`, or `string` values,
        depending on the type of the hyperparameter.
      group_name: The name of the session group containing this session,
        as a string or `None`. If `None` or empty, the group name is
        taken to be the session ID.

    Raises:
      ValueError: If two entries in `hparams` share the same
        hyperparameter name.
    """
    self._hparams = _normalize_hparams(hparams)
    self._group_name = group_name if group_name is not None else ""
    if writer is None:
      raise TypeError("writer must be a `SummaryWriter` or `str`, not None")
    elif isinstance(writer, str):
      self._writer = tf.compat.v2.summary.create_file_writer(writer)
    else:
      self._writer = writer

  def _write_summary(self, pb, step=None):
    if self._writer is None:
      raise RuntimeError(
          "hparams Keras callback cannot be reused across training sessions"
      )
    if not tf.executing_eagerly():
      raise RuntimeError(
          "hparams Keras callback only supported in TensorFlow eager mode"
      )
    raw_pb = pb.SerializeToString()
    with self._writer.as_default():
      result = tf.compat.v2.summary.experimental.write_raw_pb(raw_pb, step=step)

  def on_train_begin(self, logs=None):
    del logs  # unused
    self._write_summary(
        summary.session_start_pb(self._hparams, group_name=self._group_name),
        step=0,
    )

  def on_train_end(self, logs=None):
    del logs  # unused
    self._write_summary(
        summary.session_end_pb(api_pb2.STATUS_SUCCESS),
        step=0,
    )
    self._writer = None


def _normalize_hparams(hparams):
  """Normalize a dict keyed by `HParam`s and/or raw strings.

  Args:
    hparams: A `dict` whose keys are `HParam` objects and/or strings
      representing hyperparameter names, and whose values are
      hyperparameter values. No two keys may have the same name.

  Returns:
    A `dict` whose keys are hyperparameter names (as strings) and whose
    values are the corresponding hyperparameter values.

  Raises:
    ValueError: If two entries in `hparams` share the same
      hyperparameter name.
  """
  result = {}
  for (k, v) in six.iteritems(hparams):
    if isinstance(k, summary_v2.HParam):
      k = k.name
    if k in result:
      raise ValueError("multiple values specified for hparam %r" % (k,))
    result[k] = v
  return result
