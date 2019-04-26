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
"""Experimental public APIs for the HParams plugin.

These are porcelain on top of `api_pb2` (`api.proto`) and `summary.py`.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import abc
import time

import six
import tensorflow as tf

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import summary


def hparams_config(hparams, metrics, time_created_secs=None):
  """Write a top-level experiment description.

  An experiment has a fixed set of hyperparameters and metrics, and
  consists of multiple sessions. Each session has different associated
  hyperparameter values and metric values.

  Args:
    hparams: A list of `HParam` values.
    metrics: A list of `Metric` values.
    time_created_secs: The time that this experiment was created, as
      seconds since epoch. Defaults to the current time.
  """
  hparam_infos = []
  for hparam in hparams:
    info = api_pb2.HParamInfo(
        name=hparam.name,
        description=hparam.description,
        display_name=hparam.display_name,
    )
    domain = hparam.domain
    if domain is not None:
      domain.update_hparam_info(info)
    hparam_infos.append(info)
  metric_infos = [metric.as_proto() for metric in metrics]
  experiment_pb = summary.experiment_pb(
      hparam_infos=hparam_infos,
      metric_infos=metric_infos,
      time_created_secs=time_created_secs,
  )
  raw_pb = experiment_pb.SerializeToString()
  summary_scope = (
      getattr(tf.compat.v2.summary.experimental, "summary_scope", None)
      or tf.summary.summary_scope
  )
  with summary_scope("hparams_summary"):
    return tf.compat.v2.summary.experimental.write_raw_pb(raw_pb, step=0)


class HParam(object):
  """A hyperparameter in an experiment.

  This class describes a hyperparameter in the abstract. It ranges over
  a domain of values, but is not bound to any particular value.
  """

  def __init__(self, name, domain=None, display_name=None, description=None):
    """Create a hyperparameter object.

    Args:
      name: A string ID for this hyperparameter, which should be unique
        within an experiment.
      domain: An optional `Domain` object describing the values that
        this hyperparameter can take on.
      display_name: An optional human-readable display name (`str`).
      description: An optional Markdown string describing this
        hyperparameter.

    Raises:
      ValueError: If `domain` is not a `Domain`.
    """
    self._name = name
    self._domain = domain
    self._display_name = display_name
    self._description = description
    if not isinstance(self._domain, (Domain, type(None))):
      raise ValueError("not a domain: %r" % (self._domain,))

  def __str__(self):
    return "<HParam %r: %s>" % (self._name, self._domain)

  def __repr__(self):
    fields = [
        ("name", self._name),
        ("domain", self._domain),
        ("display_name", self._display_name),
        ("description", self._description),
    ]
    fields_string = ", ".join("%s=%r" % (k, v) for (k, v) in fields)
    return "HParam(%s)" % fields_string

  @property
  def name(self):
    return self._name

  @property
  def domain(self):
    return self._domain

  @property
  def display_name(self):
    return self._display_name

  @property
  def description(self):
    return self._description


@six.add_metaclass(abc.ABCMeta)
class Domain(object):
  """The domain of a hyperparameter.

  Domains are restricted to values of the simple types `float`, `int`,
  `str`, and `bool`.
  """

  @abc.abstractproperty
  def dtype(self):
    """Data type of this domain: `float`, `int`, `str`, or `bool`."""
    pass

  @abc.abstractmethod
  def update_hparam_info(self, hparam_info):
    """Update an `HParamInfo` proto to include this domain.

    This should update the `type` field on the proto and exactly one of
    the `domain` variants on the proto.

    Args:
      hparam_info: An `api_pb2.HParamInfo` proto to modify.
    """
    pass


class IntInterval(Domain):
  """A domain that takes on all integer values in a closed interval."""

  def __init__(self, min_value=None, max_value=None):
    """Create an `IntInterval`.

    Args:
      min_value: The lower bound (inclusive) of the interval.
      max_value: The upper bound (inclusive) of the interval.

    Raises:
      TypeError: If `min_value` or `max_value` is not an `int`.
      ValueError: If `min_value > max_value`.
    """
    if not isinstance(min_value, int):
      raise TypeError("min_value must be an int: %r" % (min_value,))
    if not isinstance(max_value, int):
      raise TypeError("max_value must be an int: %r" % (max_value,))
    if min_value > max_value:
      raise ValueError("%r > %r" % (min_value, max_value))
    self._min_value = min_value
    self._max_value = max_value

  def __str__(self):
    return "[%s, %s]" % (self._min_value, self._max_value)

  def __repr__(self):
    return "IntInterval(%r, %r)" % (self._min_value, self._max_value)

  @property
  def dtype(self):
    return int

  @property
  def min_value(self):
    return self._min_value

  @property
  def max_value(self):
    return self._max_value

  def update_hparam_info(self, hparam_info):
    hparam_info.type = api_pb2.DATA_TYPE_FLOAT64  # TODO(#1998): Add int dtype.
    hparam_info.domain_interval.min_value = self._min_value
    hparam_info.domain_interval.max_value = self._max_value


class RealInterval(Domain):
  """A domain that takes on all real values in a closed interval."""

  def __init__(self, min_value=None, max_value=None):
    """Create a `RealInterval`.

    Args:
      min_value: The lower bound (inclusive) of the interval.
      max_value: The upper bound (inclusive) of the interval.

    Raises:
      TypeError: If `min_value` or `max_value` is not an `float`.
      ValueError: If `min_value > max_value`.
    """
    if not isinstance(min_value, float):
      raise TypeError("min_value must be a float: %r" % (min_value,))
    if not isinstance(max_value, float):
      raise TypeError("max_value must be a float: %r" % (max_value,))
    if min_value > max_value:
      raise ValueError("%r > %r" % (min_value, max_value))
    self._min_value = min_value
    self._max_value = max_value

  def __str__(self):
    return "[%s, %s]" % (self._min_value, self._max_value)

  def __repr__(self):
    return "RealInterval(%r, %r)" % (self._min_value, self._max_value)

  @property
  def dtype(self):
    return float

  @property
  def min_value(self):
    return self._min_value

  @property
  def max_value(self):
    return self._max_value

  def update_hparam_info(self, hparam_info):
    hparam_info.type = api_pb2.DATA_TYPE_FLOAT64
    hparam_info.domain_interval.min_value = self._min_value
    hparam_info.domain_interval.max_value = self._max_value


class Discrete(Domain):
  """A domain that takes on a fixed set of values.

  These values may be of any (single) domain type.
  """

  def __init__(self, values, dtype=None):
    """Construct a discrete domain.

    Args:
      values: A iterable of the values in this domain.
      dtype: The Python data type of values in this domain: one of
        `int`, `float`, `bool`, or `str`. If `values` is non-empty,
        `dtype` may be `None`, in which case it will be inferred as the
        type of the first element of `values`.

    Raises:
      ValueError: If `values` is empty but no `dtype` is specified.
      ValueError: If `dtype` or its inferred value is not `int`,
        `float`, `bool`, or `str`.
      TypeError: If an element of `values` is not an instance of
        `dtype`.
    """
    self._values = list(values)
    if dtype is None:
      if self._values:
        dtype = type(self._values[0])
      else:
        raise ValueError("Empty domain with no dtype specified")
    if dtype not in (int, float, bool, str):
      raise ValueError("Unknown dtype: %r" % (dtype,))
    self._dtype = dtype
    for value in self._values:
      if not isinstance(value, self._dtype):
        raise TypeError(
            "dtype mismatch: not isinstance(%r, %s)"
            % (value, self._dtype.__name__)
        )
    self._values.sort()

  def __str__(self):
    return "{%s}" % (", ".join(repr(x) for x in self._values))

  def __repr__(self):
    return "Discrete(%r)" % (self._values,)

  @property
  def dtype(self):
    return self._dtype

  @property
  def values(self):
    return list(self._values)

  def update_hparam_info(self, hparam_info):
    hparam_info.type = {
        int: api_pb2.DATA_TYPE_FLOAT64,  # TODO(#1998): Add int dtype.
        float: api_pb2.DATA_TYPE_FLOAT64,
        bool: api_pb2.DATA_TYPE_BOOL,
        str: api_pb2.DATA_TYPE_STRING,
    }[self._dtype]
    hparam_info.ClearField("domain_discrete")
    hparam_info.domain_discrete.extend(self._values)


class Metric(object):
  """A metric in an experiment.

  A metric is a real-valued function of a model. Each metric is
  associated with a TensorBoard scalar summary, which logs the metric's
  value as the model trains.
  """
  TRAINING = api_pb2.DATASET_TRAINING
  VALIDATION = api_pb2.DATASET_VALIDATION

  def __init__(
      self,
      tag,
      group=None,
      display_name=None,
      description=None,
      dataset_type=None,
  ):
    """
    Args:
      tag: The tag name of the scalar summary that corresponds to this
        metric (as a `str`).
      group: An optional string listing the subdirectory under the
        session's log directory containing summaries for this metric.
        For instance, if summaries for training runs are written to
        events files in `ROOT_LOGDIR/SESSION_ID/train`, then `group`
        should be `"train"`. Defaults to the empty string: i.e.,
        summaries are expected to be written to the session logdir.
      display_name: An optional human-readable display name.
      description: An optional Markdown string with a human-readable
        description of this metric, to appear in TensorBoard.
      dataset_type: Either `Metric.TRAINING` or `Metric.VALIDATION`, or
        `None`.
    """
    self._tag = tag
    self._group = group
    self._display_name = display_name
    self._description = description
    self._dataset_type = dataset_type
    if self._dataset_type not in (None, Metric.TRAINING, Metric.VALIDATION):
      raise ValueError("invalid dataset type: %r" % (self._dataset_type,))

  def as_proto(self):
    return api_pb2.MetricInfo(
        name=api_pb2.MetricName(
            group=self._group,
            tag=self._tag,
        ),
        display_name=self._display_name,
        description=self._description,
        dataset_type=self._dataset_type,
    )


class KerasCallback(tf.keras.callbacks.Callback):
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
    if isinstance(k, HParam):
      k = k.name
    if k in result:
      raise ValueError("multiple values specified for hparam %r" % (k,))
    result[k] = v
  return result
