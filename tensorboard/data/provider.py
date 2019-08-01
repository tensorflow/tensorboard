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
  @abc.abstractmethod
  def list_scalars(
      self,
      experiment_id,
      owner_plugin,
      run_tag_filter=None,
  ):
    """List metadata about scalar time series.

    Args:
      experiment_id: ID of enclosing experiment.
      owner_plugin: String name of the TensorBoard plugin that created
        the data to be queried. Required.
      run_tag_filter: Optional `RunTagFilter` value. If omitted, all
        runs and tags will be included.

    The result will only contain keys for run-tag combinations that
    actually exist, which may not include all entries in the
    `run_tag_filter`.

    Returns:
      A nested map `d` such that `d[run][tag]` is a `ScalarMetadata`
      value.
    """
    pass

  @abc.abstractmethod
  def read_scalars(
      self,
      experiment_id,
      owner_plugin,
      downsample_to=None,
      run_tag_filter=None,
      step_filter=None,
  ):
    """Read values from scalar time series.

    Args:
      experiment_id: ID of enclosing experiment.
      owner_plugin: String name of the TensorBoard plugin that created
        the data to be queried. Required.
      downsample_to: Integer number of steps to which to downsample the
        results (e.g., `1000`). Required.
      run_tag_filter: Optional `RunTagFilter` value. If provided, a time
        series will only be included in the result if its run and tag
        both pass this filter. If `None`, all time series will be
        included.
      step_filter: Optional `StepFilter` value. If `None`, the entire
        range of steps may be included.

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


_ScalarMetadata = collections.namedtuple(
    "ScalarMetadata",
    ("max_step", "corresponding_wall_time", "summary_metadata"),
)
class ScalarMetadata(_ScalarMetadata):
  """Metadata about a scalar time series for a particular run and tag.

  Attributes:
    max_step: The largest step for this scalar time series; an integer.
    corresponding_wall_time: The wall time of the datum with the largest
      step in this time series, as `float` seconds since epoch.
    summary_metadata: A `summary_pb2.SummaryMetadata` value.
  """
  pass


_ScalarDatum = collections.namedtuple(
    "ScalarDatum", ("step", "wall_time", "value")
)
class ScalarDatum(_ScalarDatum):
  """A single datum in a scalar time series for a run and tag.

  Attributes:
    step: The global step at which this datum occurred; an integer. This
      is a unique key among data of this time series.
    wall_time: The real-world time at which this datum occurred, as
      `float` seconds since epoch.
    value: The scalar value for this datum; a `float`.
  """
  pass


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

  def test(self, run, tag):
    if self._runs is not None and run not in self._runs:
      return False
    if self._tags is not None and tag not in self._tags:
      return False
    return True


class StepFilter(object):
  """Filters data in a time series by step."""

  def __init__(self, lower_bound, upper_bound):
    """Construct a `StepFilter`.

    Negative values for `lower_bound` or `upper_bound` indicate indices
    from the end of the array, with the same semantics as Python slices.

    It is valid for `upper_bound` to be smaller than `lower_bound`; in
    this case, if `lower_bound` and `upper_bound` are of the same sign,
    no data will pass this filter.

    Args:
      lower_bound: The minimum step value permitted by this filter,
        inclusive. Integer.
      upper_bound: The maximum step value permitted by this filter,
        inclusive. Integer.
    """
    self._lower_bound = lower_bound
    self._upper_bound = upper_bound

  @property
  def lower_bound(self):
    return self._lower_bound

  @property
  def upper_bound(self):
    return self._upper_bound

  def resolve(self, max_step):
    """Resolve an actual lower and upper bound for a given time series.

    Args:
      max_step: The highest step of any event in the time series.

    Returns:
      A tuple `(lower_bound, upper_bound)` of nonnegative step values.
    """
    return (
        self._resolve_step(max_step, self._lower_bound),
        self._resolve_step(max_step, self._upper_bound),
    )

  def _resolve_step(self, max_step, step):
    if step >= 0:
      return step
    else:
      return max(0, max_step - ~step)
