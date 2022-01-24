# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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

"""Tests for event_file_loader."""


import abc
import io
import os

from tensorboard import test as tb_test
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.compat.proto import event_pb2
from tensorboard.summary.writer import record_writer


FILENAME = "test.events"


class EventFileLoaderTestBase(metaclass=abc.ABCMeta):
    def _append_record(self, data):
        with open(os.path.join(self.get_temp_dir(), FILENAME), "ab") as f:
            record_writer.RecordWriter(f).write(data)

    def _make_loader(self):
        return self._loader_class(os.path.join(self.get_temp_dir(), FILENAME))

    @abc.abstractproperty
    def _loader_class(self):
        """Returns the Loader class under test."""
        raise NotImplementedError()

    @abc.abstractmethod
    def assertEventWallTimes(self, load_result, event_wall_times_in_order):
        """Asserts that loader.Load() result has specified event wall times."""
        raise NotImplementedError()

    def testLoad_emptyEventFile(self):
        with open(os.path.join(self.get_temp_dir(), FILENAME), "ab") as f:
            f.write(b"")
        loader = self._make_loader()
        self.assertEmpty(list(loader.Load()))

    def testLoad_staticEventFile(self):
        self._append_record(_make_event(wall_time=1.0))
        self._append_record(_make_event(wall_time=2.0))
        self._append_record(_make_event(wall_time=3.0))
        loader = self._make_loader()
        self.assertEventWallTimes(loader.Load(), [1.0, 2.0, 3.0])

    def testLoad_dynamicEventFile(self):
        self._append_record(_make_event(wall_time=1.0))
        loader = self._make_loader()
        self.assertEventWallTimes(loader.Load(), [1.0])
        self._append_record(_make_event(wall_time=2.0))
        self.assertEventWallTimes(loader.Load(), [2.0])
        self.assertEmpty(list(loader.Load()))

    def testLoad_dynamicEventFileWithTruncation(self):
        self._append_record(_make_event(wall_time=1.0))
        self._append_record(_make_event(wall_time=2.0))
        loader = self._make_loader()
        # Use memory file to get at the raw record to emit.
        with io.BytesIO() as mem_f:
            record_writer.RecordWriter(mem_f).write(_make_event(wall_time=3.0))
            record = mem_f.getvalue()
        filepath = os.path.join(self.get_temp_dir(), FILENAME)
        with open(filepath, "ab", buffering=0) as f:
            # Record missing the last byte should result in data loss error
            # that we log and swallow.
            f.write(record[:-1])
            self.assertEventWallTimes(loader.Load(), [1.0, 2.0])
            # Retrying against the incomplete record has no effect.
            self.assertEmpty(list(loader.Load()))
            # Retrying after completing the record should return the new event.
            f.write(record[-1:])
            self.assertEventWallTimes(loader.Load(), [3.0])

    def testLoad_noIterationDoesNotConsumeEvents(self):
        self._append_record(_make_event(wall_time=1.0))
        loader = self._make_loader()
        loader.Load()
        loader.Load()
        self.assertEventWallTimes(loader.Load(), [1.0])


class RawEventFileLoaderTest(EventFileLoaderTestBase, tb_test.TestCase):
    @property
    def _loader_class(self):
        return event_file_loader.RawEventFileLoader

    def assertEventWallTimes(self, load_result, event_wall_times_in_order):
        self.assertEqual(
            [
                event_pb2.Event.FromString(record).wall_time
                for record in load_result
            ],
            event_wall_times_in_order,
        )


class EventFileLoaderTest(EventFileLoaderTestBase, tb_test.TestCase):
    @property
    def _loader_class(self):
        return event_file_loader.EventFileLoader

    def assertEventWallTimes(self, load_result, event_wall_times_in_order):
        self.assertEqual(
            [event.wall_time for event in load_result],
            event_wall_times_in_order,
        )


class TimestampedEventFileLoaderTest(EventFileLoaderTestBase, tb_test.TestCase):
    @property
    def _loader_class(self):
        return event_file_loader.TimestampedEventFileLoader

    def assertEventWallTimes(self, load_result, event_wall_times_in_order):
        transposed = list(zip(*load_result))
        wall_times, events = transposed if transposed else ([], [])
        self.assertEqual(
            list(wall_times),
            event_wall_times_in_order,
        )
        self.assertEqual(
            [event.wall_time for event in events],
            event_wall_times_in_order,
        )


def _make_event(**kwargs):
    return event_pb2.Event(**kwargs).SerializeToString()


if __name__ == "__main__":
    tb_test.main()
