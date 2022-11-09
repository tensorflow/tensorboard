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

# """Tests for EventFileWriter and _AsyncWriter"""


import os
import unittest

from tensorboard.summary.writer.event_file_writer import EventFileWriter
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import (
    PyRecordReader_New,
)
from tensorboard.compat import tf
from tensorboard import test as tb_test

import fsspec

USING_REAL_TF = tf.__version__ != "stub"


class EventFileWriterFSSpecTest(tb_test.TestCase):
    def get_temp_dir(self):
        return "file://" + super().get_temp_dir()

    def glob(self, path):
        fs, _, _ = fsspec.get_fs_token_paths(
            path,
        )
        return fs.glob(path)

    @unittest.skipIf(USING_REAL_TF, "Test only passes when using stub TF")
    def test_event_file_writer_roundtrip(self):
        _TAGNAME = "dummy"
        _DUMMY_VALUE = 42
        logdir = self.get_temp_dir()
        w = EventFileWriter(logdir)
        summary = Summary(
            value=[Summary.Value(tag=_TAGNAME, simple_value=_DUMMY_VALUE)]
        )
        fakeevent = event_pb2.Event(summary=summary)
        w.add_event(fakeevent)
        w.close()
        event_files = sorted(self.glob(os.path.join(logdir, "*")))
        self.assertEqual(len(event_files), 1)
        r = PyRecordReader_New(event_files[0])
        r.GetNext()  # meta data, so skip
        r.GetNext()
        self.assertEqual(fakeevent.SerializeToString(), r.record())

    @unittest.skipIf(USING_REAL_TF, "Test only passes when using stub TF")
    def test_setting_filename_suffix_works(self):
        logdir = self.get_temp_dir()

        w = EventFileWriter(logdir, filename_suffix=".event_horizon")
        w.close()
        event_files = sorted(self.glob(os.path.join(logdir, "*")))
        self.assertEqual(event_files[0].split(".")[-1], "event_horizon")

    @unittest.skipIf(USING_REAL_TF, "Test only passes when using stub TF")
    def test_async_writer_without_write(self):
        logdir = self.get_temp_dir()
        w = EventFileWriter(logdir)
        w.close()
        event_files = sorted(self.glob(os.path.join(logdir, "*")))
        r = PyRecordReader_New(event_files[0])
        r.GetNext()
        s = event_pb2.Event.FromString(r.record())
        self.assertEqual(s.file_version, "brain.Event:2")
        self.assertEqual(
            s.source_metadata.writer,
            "tensorboard.summary.writer.event_file_writer",
        )


if __name__ == "__main__":
    tb_test.main()
