# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Experimental framework for generic TensorBoard data providers."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import abc
import collections

import six


@six.add_metaclass(abc.ABCMeta)
class DataProvider(object):
  """Interface for reading TensorBoard scalar, tensor, and blob data.

  These APIs are under development and subject to change. For instance,
  providers may be asked to implement more filtering mechanisms, such as
  downsampling strategies or domain restriction by step or wall time.
  """

  @abc.abstractmethod
  def list_scalars(self, experiment_id, plugin_name, run_tag_filter=None):
    """List metadata about scalar time series.

    Args:
      experiment_id: ID of enclosing experiment.
      plugin_name: String name of the TensorBoard plugin that created
        the data to be queried. Required.
      run_tag_filter: Optional `RunTagFilter` value. If omitted, all
        runs and tags will be included.

    The result will only contain keys for run-tag combinations that
    actually exist, which may not include all entries in the
    `run_tag_filter`.

    Returns:
      A nested map `d` such that `d[run][tag]` is a `ScalarTimeSeries`
      value.
    """
    pass

  @abc.abstractmethod
  def read_scalars(
      self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
  ):
    """Read values from scalar time series.

    Args:
      experiment_id: ID of enclosing experiment.
      plugin_name: String name of the TensorBoard plugin that created
        the data to be queried. Required.
      downsample: Integer number of steps to which to downsample the
        results (e.g., `1000`). Required.
      run_tag_filter: Optional `RunTagFilter` value. If provided, a time
        series will only be included in the result if its run and tag
        both pass this filter. If `None`, all time series will be
        included.

    The result will only contain keys for run-tag combinations that
    actually exist, which may not include all entries in the
    `run_tag_filter`.

    Returns:
      A nested map `d` such that `d[run][tag]` is a list of
      `ScalarDatum` values sorted by step.
    """
    pass

  def list_tensors(self):
    """Not yet specified."""
    pass

  def read_tensors(self):
    """Not yet specified."""
    pass

  def list_blob_sequences(self):
    """Not yet specified."""
    pass

  def read_blob_sequences(self):
    """Not yet specified."""
    pass


class ScalarTimeSeries(object):
  """Metadata about a scalar time series for a particular run and tag.

  Attributes:
    max_step: The largest step value of any datum in this scalar time
      series; a nonnegative integer.
    max_wall_time: The largest wall time of any datum in this time
      series, as `float` seconds since epoch.
    plugin_content: A bytestring of arbitrary plugin-specific metadata
      for this time series, as provided to `tf.summary.write` in the
      `plugin_data.content` field of the `metadata` argument.
    description: An optional long-form Markdown description, as a `str`
      that is empty if no description was specified.
    display_name: An optional long-form Markdown description, as a `str`
      that is empty if no description was specified. Deprecated; may be
      removed soon.
  """

  __slots__ = (
      "_max_step",
      "_max_wall_time",
      "_plugin_content",
      "_description",
      "_display_name",
  )

  def __init__(
      self, max_step, max_wall_time, plugin_content, description, display_name
  ):
    self._max_step = max_step
    self._max_wall_time = max_wall_time
    self._plugin_content = plugin_content
    self._description = description
    self._display_name = display_name

  @property
  def max_step(self):
    return self._max_step

  @property
  def max_wall_time(self):
    return self._max_wall_time

  @property
  def plugin_content(self):
    return self._plugin_content

  @property
  def description(self):
    return self._description

  @property
  def display_name(self):
    return self._display_name

  def __repr__(self):
    return "ScalarTimeSeries(%s)" % ", ".join(
        "max_step=%r" % (self._max_step,),
        "max_wall_time=%r" % (self._max_wall_time,),
        "plugin_content=%r" % (self._plugin_content,),
        "description=%r" % (self._description,),
        "display_name=%r" % (self._display_name,),
    )


class ScalarDatum(object):
  """A single datum in a scalar time series for a run and tag.

  Attributes:
    step: The global step at which this datum occurred; an integer. This
      is a unique key among data of this time series.
    wall_time: The real-world time at which this datum occurred, as
      `float` seconds since epoch.
    value: The scalar value for this datum; a `float`.
  """

  __slots__ = ("_step", "_wall_time", "_value")

  def __init__(self, step, wall_time, value):
    self._step = step
    self._wall_time = wall_time
    self._value = value

  @property
  def step(self):
    return self._step

  @property
  def wall_time(self):
    return self._wall_time

  @property
  def value(self):
    return self._value

  def __repr__(self):
    return "ScalarDatum(step=%r, wall_time=%r, value=%r)" % (
        self._step,
        self._wall_time,
        self._value,
    )
    return "ScalarDatum(%s)" % ", ".join(
        "step=%r" % (self._step,),
        "wall_time=%r" % (self._wall_time,),
        "value=%r" % (self._value,),
    )


class RunTagFilter(object):
  """Filters data by run and tag names."""

  def __init__(self, runs=None, tags=None):
    """Construct a `RunTagFilter`.

    A time series passes this filter if both its run *and* its tag are
    included in the corresponding whitelists.

    Order and multiplicity are ignored; `runs` and `tags` are treated as
    sets.

    Args:
      runs: Collection of run names, as strings, or `None` to admit all
        runs.
      tags: Collection of tag names, as strings, or `None` to admit all
        tags.
    """
    self._runs = None if runs is None else frozenset(runs)
    self._tags = None if tags is None else frozenset(tags)

  @property
  def runs(self):
    return self._runs

  @property
  def tags(self):
    return self._tags

  def __repr__(self):
    return "RunTagFilter(runs=%r, tags=%r)" % (self._runs, self._tags)
