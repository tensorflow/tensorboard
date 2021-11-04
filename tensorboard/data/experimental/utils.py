# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Utility methods for working with the Experiment Data Access API."""

import numpy as np


def pivot_dataframe(dataframe):
    """Gets a pivoted wide-form pandas dataframe.

    The wide-form DataFrame has all its tags included as columns of the
    DataFrame, which is more convenient to work. If the condition of having
    uniform sets of step values across all tags in all runs is not met,
    this will error.

    Args:
      dataframe: pandas dataframe to pivot.

    Returns:
      Pivoted wide-form pandas dataframe.
    Raises:
      ValueError if step values across all tags are not uniform.
    """
    num_missing_0 = np.count_nonzero(dataframe.isnull().values)
    dataframe = dataframe.pivot_table(
        values=(
            ["value", "wall_time"]
            if "wall_time" in dataframe.columns
            else "value"
        ),
        index=["run", "step"],
        columns="tag",
        dropna=False,
    )
    num_missing_1 = np.count_nonzero(dataframe.isnull().values)
    if num_missing_1 > num_missing_0:
        raise ValueError(
            "pivoted DataFrame contains missing value(s). "
            "This is likely due to two timeseries having different "
            "sets of steps in your experiment. "
            "You can avoid this error by calling `get_scalars()` with "
            "`pivot=False` to disable the DataFrame pivoting."
        )
    # `reset_index()` removes the MultiIndex structure of the pivoted
    # DataFrame. Before the call, the DataFrame consits of two levels
    # of index: "run" and "step". After the call, the index become a
    # single range index (e.g,. `dataframe[:2]` works).
    dataframe = dataframe.reset_index()
    # Remove the columns name "tag".
    dataframe.columns.name = None
    dataframe.columns.names = [None for name in dataframe.columns.names]
    return dataframe
