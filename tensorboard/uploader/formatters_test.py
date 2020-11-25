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
# Lint as: python3
"""Tests for tensorboard.uploader.formatters."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import time
from unittest import mock

from tensorboard import test as tb_test
from tensorboard.uploader import formatters
from tensorboard.uploader.proto import experiment_pb2

from tensorboard.uploader import util


class TensorBoardExporterTest(tb_test.TestCase):
    def _format(self, formatter, experiment, experiment_url, timezone="UTC"):
        """Test helper that ensures formatting is done with known timezone."""
        try:
            with mock.patch.dict(os.environ, {"TZ": timezone}):
                time.tzset()
                return formatter.format_experiment(experiment, experiment_url)
        finally:
            time.tzset()

    def testReadableFormatterWithNonemptyNameAndDescription(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            name="A name for the experiment",
            description="A description for the experiment",
            num_runs=2,
            num_tags=4,
            num_scalars=60,
            total_tensor_bytes=789,
            total_blob_bytes=1234,
        )
        util.set_timestamp(experiment.create_time, 981173106)
        util.set_timestamp(experiment.update_time, 1015218367)
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.ReadableFormatter()
        output = self._format(formatter, experiment, experiment_url)
        expected_lines = [
            "http://tensorboard.dev/deadbeef",
            "\tName                 A name for the experiment",
            "\tDescription          A description for the experiment",
            "\tId                   deadbeef",
            "\tCreated              2001-02-03 04:05:06",
            "\tUpdated              2002-03-04 05:06:07",
            "\tRuns                 2",
            "\tTags                 4",
            "\tScalars              60",
            "\tTensor bytes         789",
            "\tBinary object bytes  1234",
        ]
        self.assertEqual(output.split("\n"), expected_lines)

    def testReadableFormatterWithNonUtcTimezone(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            name="A name for the experiment",
            description="A description for the experiment",
            num_runs=2,
            num_tags=4,
            num_scalars=60,
            total_tensor_bytes=0,
            total_blob_bytes=1234,
        )
        util.set_timestamp(experiment.create_time, 981173106)
        util.set_timestamp(experiment.update_time, 1015218367)
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.ReadableFormatter()
        output = self._format(
            formatter,
            experiment,
            experiment_url,
            timezone="America/Los_Angeles",
        )
        expected_lines = [
            "http://tensorboard.dev/deadbeef",
            "\tName                 A name for the experiment",
            "\tDescription          A description for the experiment",
            "\tId                   deadbeef",
            "\tCreated              2001-02-02 20:05:06",
            "\tUpdated              2002-03-03 21:06:07",
            "\tRuns                 2",
            "\tTags                 4",
            "\tScalars              60",
            "\tTensor bytes         0",
            "\tBinary object bytes  1234",
        ]
        self.assertEqual(output.split("\n"), expected_lines)

    def testReadableFormatterWithEmptyNameAndDescription(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            # NOTE(cais): `name` and `description` are missing here.
            num_runs=2,
            num_tags=4,
            num_scalars=60,
            total_tensor_bytes=789,
            total_blob_bytes=1234,
        )
        util.set_timestamp(experiment.create_time, 981173106)
        util.set_timestamp(experiment.update_time, 1015218367)
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.ReadableFormatter()
        output = self._format(formatter, experiment, experiment_url)
        expected_lines = [
            "http://tensorboard.dev/deadbeef",
            "\tName                 [No Name]",
            "\tDescription          [No Description]",
            "\tId                   deadbeef",
            "\tCreated              2001-02-03 04:05:06",
            "\tUpdated              2002-03-04 05:06:07",
            "\tRuns                 2",
            "\tTags                 4",
            "\tScalars              60",
            "\tTensor bytes         789",
            "\tBinary object bytes  1234",
        ]
        self.assertEqual(output.split("\n"), expected_lines)

    def testJsonFormatterWithEmptyNameAndDescription(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            # NOTE(cais): `name` and `description` are missing here.
            num_runs=2,
            num_tags=4,
            num_scalars=60,
            total_tensor_bytes=789,
            total_blob_bytes=1234,
        )
        util.set_timestamp(experiment.create_time, 981173106)
        util.set_timestamp(experiment.update_time, 1015218367)
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.JsonFormatter()
        output = self._format(formatter, experiment, experiment_url)
        expected_lines = [
            "{",
            '  "url": "http://tensorboard.dev/deadbeef",',
            '  "name": "",',
            '  "description": "",',
            '  "id": "deadbeef",',
            '  "created": "2001-02-03T04:05:06Z",',
            '  "updated": "2002-03-04T05:06:07Z",',
            '  "runs": 2,',
            '  "tags": 4,',
            '  "scalars": 60,',
            '  "tensor_bytes": 789,',
            '  "binary_object_bytes": 1234',
            "}",
        ]
        self.assertEqual(output.split("\n"), expected_lines)

    def testJsonFormatterWithNonUtcTimezone(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            # NOTE(cais): `name` and `description` are missing here.
            num_runs=2,
            num_tags=4,
            num_scalars=60,
            total_tensor_bytes=789,
            total_blob_bytes=1234,
        )
        util.set_timestamp(experiment.create_time, 981173106)
        util.set_timestamp(experiment.update_time, 1015218367)
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.JsonFormatter()
        output = self._format(
            formatter,
            experiment,
            experiment_url,
            timezone="America/Los_Angeles",
        )
        expected_lines = [
            "{",
            '  "url": "http://tensorboard.dev/deadbeef",',
            '  "name": "",',
            '  "description": "",',
            '  "id": "deadbeef",',
            # NOTE(cais): Here we assert that the JsonFormat output is not
            # affected by the timezone.
            '  "created": "2001-02-03T04:05:06Z",',
            '  "updated": "2002-03-04T05:06:07Z",',
            '  "runs": 2,',
            '  "tags": 4,',
            '  "scalars": 60,',
            '  "tensor_bytes": 789,',
            '  "binary_object_bytes": 1234',
            "}",
        ]
        self.assertEqual(output.split("\n"), expected_lines)


if __name__ == "__main__":
    tb_test.main()
