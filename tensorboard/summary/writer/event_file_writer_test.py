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


import glob
import os
import threading
import time
from typing import Optional
from unittest.mock import MagicMock

from tensorboard.summary.writer.event_file_writer import EventFileWriter
from tensorboard.summary.writer.event_file_writer import _AsyncWriter
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import (
    PyRecordReader_New,
)
from tensorboard import test as tb_test


class EventFileWriterTest(tb_test.TestCase):
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
        event_files = sorted(glob.glob(os.path.join(logdir, "*")))
        self.assertEqual(len(event_files), 1)
        r = PyRecordReader_New(event_files[0])
        r.GetNext()  # meta data, so skip
        r.GetNext()
        self.assertEqual(fakeevent.SerializeToString(), r.record())

    def test_setting_filename_suffix_works(self):
        logdir = self.get_temp_dir()

        w = EventFileWriter(logdir, filename_suffix=".event_horizon")
        w.close()
        event_files = sorted(glob.glob(os.path.join(logdir, "*")))
        self.assertEqual(event_files[0].split(".")[-1], "event_horizon")

    def test_async_writer_without_write(self):
        logdir = self.get_temp_dir()
        w = EventFileWriter(logdir)
        w.close()
        event_files = sorted(glob.glob(os.path.join(logdir, "*")))
        r = PyRecordReader_New(event_files[0])
        r.GetNext()
        s = event_pb2.Event.FromString(r.record())
        self.assertEqual(s.file_version, "brain.Event:2")
        self.assertEqual(
            s.source_metadata.writer,
            "tensorboard.summary.writer.event_file_writer",
        )


class AsyncWriterTest(tb_test.TestCase):
    def test_async_writer_write_once(self):
        filename = os.path.join(self.get_temp_dir(), "async_writer_write_once")
        w = _AsyncWriter(open(filename, "wb"))
        bytes_to_write = b"hello world"
        w.write(bytes_to_write)
        w.close()
        with open(filename, "rb") as f:
            self.assertEqual(f.read(), bytes_to_write)

    def test_async_writer_write_queue_full(self):
        filename = os.path.join(
            self.get_temp_dir(), "async_writer_write_queue_full"
        )
        w = _AsyncWriter(open(filename, "wb"))
        bytes_to_write = b"hello world"
        repeat = 100
        for i in range(repeat):
            w.write(bytes_to_write)
        w.close()
        with open(filename, "rb") as f:
            self.assertEqual(f.read(), bytes_to_write * repeat)

    def test_async_writer_write_one_slot_queue(self):
        filename = os.path.join(
            self.get_temp_dir(), "async_writer_write_one_slot_queue"
        )
        w = _AsyncWriter(open(filename, "wb"), max_queue_size=1)
        bytes_to_write = b"hello world"
        repeat = 10  # faster
        for i in range(repeat):
            w.write(bytes_to_write)
        w.close()
        with open(filename, "rb") as f:
            self.assertEqual(f.read(), bytes_to_write * repeat)

    def test_async_writer_close_triggers_flush(self):
        filename = os.path.join(
            self.get_temp_dir(), "async_writer_close_triggers_flush"
        )
        w = _AsyncWriter(open(filename, "wb"))
        bytes_to_write = b"x" * 64
        w.write(bytes_to_write)
        w.close()
        with open(filename, "rb") as f:
            self.assertEqual(f.read(), bytes_to_write)

    def test_write_after_async_writer_closed(self):
        filename = os.path.join(
            self.get_temp_dir(), "write_after_async_writer_closed"
        )
        w = _AsyncWriter(open(filename, "wb"))
        bytes_to_write = b"x" * 64
        w.write(bytes_to_write)
        w.close()

        with self.assertRaises(IOError):
            w.write(bytes_to_write)
        # nothing is written to the file after close
        with open(filename, "rb") as f:
            self.assertEqual(f.read(), bytes_to_write)

    def test_exception_in_background_thread_while_waiting_to_put(self):
        record_writer_mock = MagicMock()
        w = _AsyncWriter(record_writer_mock, max_queue_size=10)

        cv = threading.Condition()
        writing_can_proceed: bool = False
        last_write_timestamp: Optional[float] = None

        def writing_routine():
            nonlocal last_write_timestamp
            # 30 messages should be enough to fill the queue even if some of
            # the events are dequeued in the background thread.
            for _ in range(30):
                w.write(b"x" * 64)
                last_write_timestamp = time.time()

        def on_write(*args, **kwargs) -> None:
            with cv:
                cv.wait_for(lambda: writing_can_proceed)
            raise Exception()

        record_writer_mock.write.side_effect = on_write
        thread = threading.Thread(target=writing_routine, daemon=True)
        thread.start()

        with cv:
            # Wait until the writing routine is blocked on writing.
            while (
                last_write_timestamp is None
                or time.time() < last_write_timestamp + 1
            ):
                cv.wait(0.1)
            writing_can_proceed = True
            cv.notify_all()

        # If the thread joins successfully, it means that the exception was
        # successfully propagated. 10 seconds should be more than enough to
        # make sure that the thread is hanging.
        thread.join(timeout=10)
        self.assertFalse(thread.is_alive())


if __name__ == "__main__":
    tb_test.main()
