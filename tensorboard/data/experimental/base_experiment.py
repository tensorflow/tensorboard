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
"""Base Class of Experiment Data Access API."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import abc

import six


@six.add_metaclass(abc.ABCMeta)
class BaseExperiment(object):
    """Base class for experiment data access."""

    # TODO(cais): Add list_scalar_runs().
    # TODO(cais): Add list_scalar_tags().

    @abc.abstractmethod
    def get_scalars(self, runs_filter=None, tags_filter=None, pivot=True):
        """Export scalar data as a pandas.DataFrame.

        Args:
          runs_filter: A regex filter for runs (e.g., r'run_[2-4]'). Operates in
            logical AND relation with `tags_filter`.
          tags_filter: A regex filter for tags (e.g., r'.*loss.*'). Operates in
            logical AND related with `runs_filter`.
          pivot: Whether to returned DataFrame will be pivoted (via pandas’
            `pivot_data()` method to a “wide” format wherein the tags of a
            given run and a given step are all collected in a single row.

        Returns:
          If `pivot` (default):
            A pivoted DataFrame with the indexing columns of
              - run
              - tag
            And value columns that correspond to the tags.
            Duplicate entries for each run-step combination will be aggregated
            with `numpy.stack`. This format is more friendly to manipulation and
            plotting and hence io chosen as the default. When certain rows have
            missing values, a warning message will be displayed and advise the
            user to use the `pivot=False` if steps have different meanings in
            the experiment.
          If `not pivot`:
            A DataFrame with the following columns.
              - run: (non-null object)
              - tag: (non-null object)
              - steps: (non-null int64)
              - wall_time: (non-null object)
              - value: (non-null float32)

          The row sort order is: run start time >> tag >> steps >> wall_time
          (ascending).
        """
        pass
