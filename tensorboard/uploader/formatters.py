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
"""Helpers that format the information about experiments as strings."""


import abc
import collections
import json

from tensorboard.uploader import util


class BaseExperimentFormatter(object):
    """Abstract base class for formatting experiment information as a string."""

    __metaclass__ = abc.ABCMeta

    @abc.abstractmethod
    def format_experiment(self, experiment, experiment_url):
        """Format the information about an experiment as a representing string.

        Args:
          experiment: An `experiment_pb2.Experiment` protobuf message for the
            experiment to be formatted.
          experiment_url: The URL at which the experiment can be accessed via
            TensorBoard.

        Returns:
          A string that represents the experiment.
        """
        pass


class ReadableFormatter(BaseExperimentFormatter):
    """A formatter implementation that outputs human-readable text."""

    _NAME_COLUMN_WIDTH = 20

    def __init__(self):
        super(ReadableFormatter, self).__init__()

    def format_experiment(self, experiment, experiment_url):
        output = []
        output.append(experiment_url)
        data = [
            ("Name", experiment.name or "[No Name]"),
            ("Description", experiment.description or "[No Description]"),
            ("Id", experiment.experiment_id),
            ("Created", util.format_time(experiment.create_time)),
            ("Updated", util.format_time(experiment.update_time)),
            ("Runs", str(experiment.num_runs)),
            ("Tags", str(experiment.num_tags)),
            ("Scalars", str(experiment.num_scalars)),
            ("Tensor bytes", str(experiment.total_tensor_bytes)),
            ("Binary object bytes", str(experiment.total_blob_bytes)),
        ]
        for name, value in data:
            output.append(
                "\t%s %s"
                % (
                    name.ljust(self._NAME_COLUMN_WIDTH),
                    value,
                )
            )
        return "\n".join(output)


class JsonFormatter(object):
    """A formatter implementation: outputs experiment as JSON."""

    _JSON_INDENT = 2

    def __init__(self):
        super(JsonFormatter, self).__init__()

    def format_experiment(self, experiment, experiment_url):
        data = [
            ("url", experiment_url),
            ("name", experiment.name),
            ("description", experiment.description),
            ("id", experiment.experiment_id),
            ("created", util.format_time_absolute(experiment.create_time)),
            ("updated", util.format_time_absolute(experiment.update_time)),
            ("runs", experiment.num_runs),
            ("tags", experiment.num_tags),
            ("scalars", experiment.num_scalars),
            ("tensor_bytes", experiment.total_tensor_bytes),
            ("binary_object_bytes", experiment.total_blob_bytes),
        ]
        return json.dumps(
            collections.OrderedDict(data),
            indent=self._JSON_INDENT,
        )
