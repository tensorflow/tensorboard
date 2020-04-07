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
"""Helpers that format experiment metadata as strings."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import json

EXPERIMENT_METADATA_URL_JSON_KEY = "url"
ExperimentMetadataField = collections.namedtuple(
    "ExperimentMetadataField",
    ("json_key", "readable_name", "value", "formatter"),
)


class BaseExperimentMetadataFormatter(object):
    """Abstract base class for formatting experiment metadata as a string."""

    def format_experiment(self, experiment_metadata):
        """Format a list of `ExperimentMetadataField`s as a representing string.

        Args:
          experiment_metadata: A list of `ExperimentMetadataField`s that
            describes an experiment.

        Returns:
          A string that represents the `experiment_metadata`.
        """
        raise NotImplementedError()


class ReadableFormatter(BaseExperimentMetadataFormatter):
    """A formatter implementation that outputs human-readable text."""

    def __init__(self, name_column_width):
        """Constructor of ReadableFormatter.

        Args:
          name_column_width: The width of the column that contains human-readable
            field names (i.e., `readable_name` in `ExperimentMetadataField`).
            Must be greater than the longest human-readable field name.
        """
        super(ReadableFormatter, self).__init__()
        self._name_column_width = name_column_width

    def format_experiment(self, experiment_metadata):
        output = []
        for metadata_field in experiment_metadata:
            if metadata_field.json_key == EXPERIMENT_METADATA_URL_JSON_KEY:
                output.append(metadata_field.value)
            else:
                output.append(
                    "\t%s %s"
                    % (
                        metadata_field.readable_name.ljust(
                            self._name_column_width
                        ),
                        metadata_field.formatter(metadata_field.value),
                    )
                )
        return "\n".join(output)


class JsonFormatter(object):
    """A formatter implementation: outputs metadata of an experiment as JSON."""

    def __init__(self, indent):
        """Constructor of JsonFormatter.

        Args:
          indent: Size of indentation (in number of spaces) used for JSON
            formatting.
        """
        super(JsonFormatter, self).__init__()
        self._indent = indent

    def format_experiment(self, experiment_metadata):
        return json.dumps(
            collections.OrderedDict(
                (metadata_field.json_key, metadata_field.value)
                for metadata_field in experiment_metadata
            ),
            indent=self._indent,
        )
