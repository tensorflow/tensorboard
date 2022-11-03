# Copyright 2022 The TensorFlow Authors. All Rights Reserved.
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

"""Tests for event_util."""

from unittest import mock

from tensorboard import test as tb_test
from tensorboard.backend.event_processing import event_util
from tensorboard.compat.proto import event_pb2
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()


class EventUtilTest(tb_test.TestCase):
    def testParseFileVersion_success(self):
        self.assertEqual(event_util.ParseFileVersion("brain.Event:1.0"), 1.0)

    def testParseFileVersion_invalidFileVersion(self):
        with mock.patch.object(
            logger, "warning", autospec=True, spec_set=True
        ) as mock_log:
            version = event_util.ParseFileVersion("invalid")
            self.assertEqual(version, -1)
        mock_log.assert_called_once_with(
            "Invalid event.proto file_version. Defaulting to use of "
            "out-of-order event.step logic for purging expired events."
        )

    def testGetSourceWriter_success(self):
        expected_writer = "tensorboard.summary.writer.event_file_writer"
        actual_writer = event_util.GetSourceWriter(
            event_pb2.SourceMetadata(writer=expected_writer)
        )
        self.assertEqual(actual_writer, expected_writer)

    def testGetSourceWriter_noWriter(self):
        actual_writer = event_util.GetSourceWriter(
            event_pb2.SourceMetadata(writer="")
        )
        self.assertIsNone(actual_writer)

    def testGetSourceWriter_writerNameTooLong(self):
        long_writer_name = "a" * (event_util._MAX_WRITER_NAME_LEN + 1)
        with mock.patch.object(
            logger, "error", autospec=True, spec_set=True
        ) as mock_log:
            actual_writer = event_util.GetSourceWriter(
                event_pb2.SourceMetadata(writer=long_writer_name)
            )
            self.assertIsNone(actual_writer)
        mock_log.assert_called_once_with(
            "Source writer name `%s` is too long, maximum allowed length is %d.",
            long_writer_name,
            event_util._MAX_WRITER_NAME_LEN,
        )


if __name__ == "__main__":
    tb_test.main()
