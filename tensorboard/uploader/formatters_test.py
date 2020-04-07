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


class TensorBoardExporterTest(tb_test.TestCase):
    def testReadableFormatterWithNonemptyNameAndDescription(self):
        data = [
            formatters.ExperimentMetadataField(
                formatters.EXPERIMENT_METADATA_URL_JSON_KEY,
                "URL",
                "http://tensorboard.dev/deadbeef",
                str,
            ),
            formatters.ExperimentMetadataField(
                "name",
                "Name",
                "A name for the experiment",
                lambda x: x or "[No Name]",
            ),
            formatters.ExperimentMetadataField(
                "description",
                "Description",
                "A description for the experiment",
                lambda x: x or "[No Description]",
            ),
        ]
        formatter = formatters.ReadableFormatter(12)
        output = formatter.format_experiment(data)
        lines = output.split("\n")
        self.assertLen(lines, 3)
        self.assertEqual(lines[0], "http://tensorboard.dev/deadbeef")
        self.assertEqual(lines[1], "\tName         A name for the experiment")
        self.assertEqual(
            lines[2], "\tDescription  A description for the experiment"
        )

    def testReadableFormatterWithEmptyNameAndDescription(self):
        data = [
            formatters.ExperimentMetadataField(
                formatters.EXPERIMENT_METADATA_URL_JSON_KEY,
                "URL",
                "http://tensorboard.dev/deadbeef",
                str,
            ),
            formatters.ExperimentMetadataField(
                "name", "Name", "", lambda x: x or "[No Name]",
            ),
            formatters.ExperimentMetadataField(
                "description",
                "Description",
                "",
                lambda x: x or "[No Description]",
            ),
        ]
        formatter = formatters.ReadableFormatter(12)
        output = formatter.format_experiment(data)
        lines = output.split("\n")
        self.assertLen(lines, 3)
        self.assertEqual(lines[0], "http://tensorboard.dev/deadbeef")
        self.assertEqual(lines[1], "\tName         [No Name]")
        self.assertEqual(lines[2], "\tDescription  [No Description]")

    def testJsonFormatterWithEmptyNameAndDescription(self):
        data = [
            formatters.ExperimentMetadataField(
                formatters.EXPERIMENT_METADATA_URL_JSON_KEY,
                "URL",
                "http://tensorboard.dev/deadbeef",
                str,
            ),
            formatters.ExperimentMetadataField(
                "name", "Name", "", lambda x: x or "[No Name]",
            ),
            formatters.ExperimentMetadataField(
                "description",
                "Description",
                "",
                lambda x: x or "[No Description]",
            ),
            formatters.ExperimentMetadataField("runs", "Runs", 8, str,),
            formatters.ExperimentMetadataField("tags", "Tags", 12, str,),
            formatters.ExperimentMetadataField(
                "binary_object_bytes", "Binary object bytes", 2000, str,
            ),
        ]
        formatter = formatters.JsonFormatter(2)
        output = formatter.format_experiment(data)
        lines = output.split("\n")
        self.assertLen(lines, 8)
        self.assertEqual(lines[0], "{")
        self.assertEqual(
            lines[1], '  "url": "http://tensorboard.dev/deadbeef",'
        )
        self.assertEqual(lines[2], '  "name": "",')
        self.assertEqual(lines[3], '  "description": "",')
        self.assertEqual(lines[4], '  "runs": 8,')
        self.assertEqual(lines[5], '  "tags": 12,')
        self.assertEqual(lines[6], '  "binary_object_bytes": 2000')
        self.assertEqual(lines[7], "}")


if __name__ == "__main__":
    tb_test.main()
