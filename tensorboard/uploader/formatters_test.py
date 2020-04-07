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
# Lint as: python3
"""Tests for tensorboard.uploader.formatters."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard import test as tb_test
from tensorboard.uploader import formatters
from tensorboard.uploader.proto import experiment_pb2


class TensorBoardExporterTest(tb_test.TestCase):
    def testReadableFormatterWithNonemptyNameAndDescription(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            name="A name for the experiment",
            description="A description for the experiment",
            num_runs=2,
            num_tags=4,
            num_scalars=60,
        )
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.ReadableFormatter()
        output = formatter.format_experiment(experiment, experiment_url)
        lines = output.split("\n")
        self.assertLen(lines, 9)
        self.assertEqual(lines[0], "http://tensorboard.dev/deadbeef")
        self.assertEqual(lines[1], "\tName         A name for the experiment")
        self.assertEqual(
            lines[2], "\tDescription  A description for the experiment"
        )
        self.assertEqual(lines[3], "\tId           deadbeef")
        self.assertEqual(lines[4], "\tCreated      1970-01-01 00:00:00")
        self.assertEqual(lines[5], "\tUpdated      1970-01-01 00:00:00")
        self.assertEqual(lines[6], "\tRuns         2")
        self.assertEqual(lines[7], "\tTags         4")
        self.assertEqual(lines[8], "\tScalars      60")

    def testReadableFormatterWithEmptyNameAndDescription(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            # NOTE(cais): `name` and `description` are missing here.
        )
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.ReadableFormatter()
        output = formatter.format_experiment(experiment, experiment_url)
        lines = output.split("\n")
        self.assertLen(lines, 9)
        self.assertEqual(lines[0], "http://tensorboard.dev/deadbeef")
        self.assertEqual(lines[1], "\tName         [No Name]")
        self.assertEqual(lines[2], "\tDescription  [No Description]")

    def testJsonFormatterWithEmptyNameAndDescription(self):
        experiment = experiment_pb2.Experiment(
            experiment_id="deadbeef",
            # NOTE(cais): `name` and `description` are missing here.
            num_runs=2,
            num_tags=4,
            num_scalars=60,
        )
        experiment_url = "http://tensorboard.dev/deadbeef"
        formatter = formatters.JsonFormatter()
        output = formatter.format_experiment(experiment, experiment_url)
        lines = output.split("\n")
        self.assertLen(lines, 11)
        self.assertEqual(lines[0], "{")
        self.assertEqual(
            lines[1], '  "url": "http://tensorboard.dev/deadbeef",'
        )
        self.assertEqual(lines[2], '  "name": "",')
        self.assertEqual(lines[3], '  "description": "",')
        self.assertEqual(lines[4], '  "id": "deadbeef",')
        self.assertEqual(lines[5], '  "created": "1970-01-01 00:00:00",')
        self.assertEqual(lines[6], '  "updated": "1970-01-01 00:00:00",')
        self.assertEqual(lines[7], '  "runs": 2,')
        self.assertEqual(lines[8], '  "tags": 4,')
        self.assertEqual(lines[9], '  "scalars": 60')
        self.assertEqual(lines[10], "}")


if __name__ == "__main__":
    tb_test.main()
