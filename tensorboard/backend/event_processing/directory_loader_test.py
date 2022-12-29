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

"""Tests for directory_loader."""


import functools
import glob
import os
import shutil
from unittest import mock

import tensorflow as tf

from tensorboard.backend.event_processing import directory_loader
from tensorboard.backend.event_processing import directory_watcher
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.backend.event_processing import io_wrapper
from tensorboard.util import test_util


class _TimestampedByteLoader:
    """A loader that loads timestamped bytes from a file."""

    def __init__(self, path, registry=None):
        self._path = path
        self._registry = registry if registry is not None else []
        self._registry.append(path)
        self._f = open(path)

    def __del__(self):
        self._registry.remove(self._path)

    def Load(self):
        while True:
            line = self._f.readline()
            if not line:
                return
            ts, value = line.rstrip("\n").split(":")
            yield float(ts), value


class DirectoryLoaderTest(tf.test.TestCase):
    def setUp(self):
        # Put everything in a directory so it's easier to delete w/in tests.
        self._directory = os.path.join(self.get_temp_dir(), "testdir")
        os.mkdir(self._directory)
        self._loader = directory_loader.DirectoryLoader(
            self._directory, _TimestampedByteLoader
        )

    def _WriteToFile(self, filename, data, timestamps=None):
        if timestamps is None:
            timestamps = range(len(data))
        self.assertEqual(len(data), len(timestamps))
        path = os.path.join(self._directory, filename)
        with open(path, "a") as f:
            for byte, timestamp in zip(data, timestamps):
                f.write("%f:%s\n" % (timestamp, byte))

    def assertLoaderYields(self, values):
        self.assertEqual(list(self._loader.Load()), values)

    def testRaisesWithBadArguments(self):
        with self.assertRaises(ValueError):
            directory_loader.DirectoryLoader(None, lambda x: None)
        with self.assertRaises(ValueError):
            directory_loader.DirectoryLoader("dir", None)

    def testEmptyDirectory(self):
        self.assertLoaderYields([])

    def testSingleFileLoading(self):
        self._WriteToFile("a", "abc")
        self.assertLoaderYields(["a", "b", "c"])
        self.assertLoaderYields([])
        self._WriteToFile("a", "xyz")
        self.assertLoaderYields(["x", "y", "z"])
        self.assertLoaderYields([])

    def testMultipleFileLoading(self):
        self._WriteToFile("a", "a")
        self._WriteToFile("b", "b")
        self.assertLoaderYields(["a", "b"])
        self.assertLoaderYields([])
        self._WriteToFile("a", "A")
        self._WriteToFile("b", "B")
        self._WriteToFile("c", "c")
        # The loader should read new data from all the files.
        self.assertLoaderYields(["A", "B", "c"])
        self.assertLoaderYields([])

    def testMultipleFileLoading_intermediateEmptyFiles(self):
        self._WriteToFile("a", "a")
        self._WriteToFile("b", "")
        self._WriteToFile("c", "c")
        self.assertLoaderYields(["a", "c"])

    def testPathFilter(self):
        self._loader = directory_loader.DirectoryLoader(
            self._directory,
            _TimestampedByteLoader,
            lambda path: "tfevents" in path,
        )
        self._WriteToFile("skipped", "a")
        self._WriteToFile("event.out.tfevents.foo.bar", "b")
        self._WriteToFile("tf.event", "c")
        self.assertLoaderYields(["b"])

    def testActiveFilter_staticFilterBehavior(self):
        """Tests behavior of a static active_filter."""
        loader_registry = []
        loader_factory = functools.partial(
            _TimestampedByteLoader, registry=loader_registry
        )
        active_filter = lambda timestamp: timestamp >= 2
        self._loader = directory_loader.DirectoryLoader(
            self._directory, loader_factory, active_filter=active_filter
        )

        def assertLoadersForPaths(paths):
            paths = [os.path.join(self._directory, path) for path in paths]
            self.assertEqual(loader_registry, paths)

        # a: normal-looking file.
        # b: file without sufficiently active data (should be marked inactive).
        # c: file with timestamps in reverse order (max computed correctly).
        # d: empty file (should be considered active in absence of timestamps).
        self._WriteToFile("a", ["A1", "A2"], [1, 2])
        self._WriteToFile("b", ["B1"], [1])
        self._WriteToFile("c", ["C2", "C1", "C0"], [2, 1, 0])
        self._WriteToFile("d", [], [])
        self.assertLoaderYields(["A1", "A2", "B1", "C2", "C1", "C0"])
        assertLoadersForPaths(["a", "c", "d"])
        self._WriteToFile("a", ["A3"], [3])
        self._WriteToFile("b", ["B3"], [3])
        self._WriteToFile("c", ["C0"], [0])
        self._WriteToFile("d", ["D3"], [3])
        self.assertLoaderYields(["A3", "C0", "D3"])
        assertLoadersForPaths(["a", "c", "d"])
        # Check that a 0 timestamp in file C on the most recent load doesn't
        # override the max timestamp of 2 seen in the earlier load.
        self._WriteToFile("c", ["C4"], [4])
        self.assertLoaderYields(["C4"])
        assertLoadersForPaths(["a", "c", "d"])

    def testActiveFilter_dynamicFilterBehavior(self):
        """Tests behavior of a dynamic active_filter."""
        loader_registry = []
        loader_factory = functools.partial(
            _TimestampedByteLoader, registry=loader_registry
        )
        threshold = 0
        active_filter = lambda timestamp: timestamp >= threshold
        self._loader = directory_loader.DirectoryLoader(
            self._directory, loader_factory, active_filter=active_filter
        )

        def assertLoadersForPaths(paths):
            paths = [os.path.join(self._directory, path) for path in paths]
            self.assertEqual(loader_registry, paths)

        self._WriteToFile("a", ["A1", "A2"], [1, 2])
        self._WriteToFile("b", ["B1", "B2", "B3"], [1, 2, 3])
        self._WriteToFile("c", ["C1"], [1])
        threshold = 2
        # First load pass should leave file C marked inactive.
        self.assertLoaderYields(["A1", "A2", "B1", "B2", "B3", "C1"])
        assertLoadersForPaths(["a", "b"])
        self._WriteToFile("a", ["A4"], [4])
        self._WriteToFile("b", ["B4"], [4])
        self._WriteToFile("c", ["C4"], [4])
        threshold = 3
        # Second load pass should mark file A as inactive (due to newly
        # increased threshold) and thus skip reading data from it.
        self.assertLoaderYields(["B4"])
        assertLoadersForPaths(["b"])
        self._WriteToFile("b", ["B5", "B6"], [5, 6])
        # Simulate a third pass in which the threshold increases while
        # we're processing a file, so it's still active at the start of the
        # load but should be marked inactive at the end.
        load_generator = self._loader.Load()
        self.assertEqual("B5", next(load_generator))
        threshold = 7
        self.assertEqual(["B6"], list(load_generator))
        assertLoadersForPaths([])
        # Confirm that all loaders are now inactive.
        self._WriteToFile("b", ["B7"], [7])
        self.assertLoaderYields([])

    def testDoesntCrashWhenCurrentFileIsDeleted(self):
        # Use actual file loader so it emits the real error.
        self._loader = directory_loader.DirectoryLoader(
            self._directory, event_file_loader.TimestampedEventFileLoader
        )
        with test_util.FileWriter(
            self._directory, filename_suffix=".a"
        ) as writer_a:
            writer_a.add_test_summary("a")
        events = list(self._loader.Load())
        events.pop(0)  # Ignore the file_version event.
        self.assertEqual(1, len(events))
        self.assertEqual("a", events[0].summary.value[0].tag)
        os.remove(glob.glob(os.path.join(self._directory, "*.a"))[0])
        with test_util.FileWriter(
            self._directory, filename_suffix=".b"
        ) as writer_b:
            writer_b.add_test_summary("b")
        events = list(self._loader.Load())
        events.pop(0)  # Ignore the file_version event.
        self.assertEqual(1, len(events))
        self.assertEqual("b", events[0].summary.value[0].tag)

    def testDoesntCrashWhenUpcomingFileIsDeleted(self):
        # Use actual file loader so it emits the real error.
        self._loader = directory_loader.DirectoryLoader(
            self._directory, event_file_loader.TimestampedEventFileLoader
        )
        with test_util.FileWriter(
            self._directory, filename_suffix=".a"
        ) as writer_a:
            writer_a.add_test_summary("a")
        with test_util.FileWriter(
            self._directory, filename_suffix=".b"
        ) as writer_b:
            writer_b.add_test_summary("b")
        generator = self._loader.Load()
        next(generator)  # Ignore the file_version event.
        event = next(generator)
        self.assertEqual("a", event.summary.value[0].tag)
        os.remove(glob.glob(os.path.join(self._directory, "*.b"))[0])
        self.assertEmpty(list(generator))

    def testRaisesDirectoryDeletedError_whenDirectoryIsDeleted(self):
        self._WriteToFile("a", "a")
        self.assertLoaderYields(["a"])
        shutil.rmtree(self._directory)
        with self.assertRaises(directory_watcher.DirectoryDeletedError):
            next(self._loader.Load())

    def testDoesntRaiseDirectoryDeletedError_forUnrecognizedException(self):
        self._WriteToFile("a", "a")
        self.assertLoaderYields(["a"])

        class MyException(Exception):
            pass

        with mock.patch.object(
            io_wrapper, "ListDirectoryAbsolute"
        ) as mock_listdir:
            mock_listdir.side_effect = MyException
            with self.assertRaises(MyException):
                next(self._loader.Load())
        self.assertLoaderYields([])


if __name__ == "__main__":
    tf.test.main()
