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
"""Tests for tensorboard.uploader.util."""


import datetime
import os
import time
import unittest
from unittest import mock

from google.protobuf import timestamp_pb2
from tensorboard.uploader import util
from tensorboard import test as tb_test


class GetUserConfigDirectoryTest(tb_test.TestCase):
    def test_windows(self):
        with mock.patch.object(os, "name", "nt"):
            with mock.patch.dict(
                os.environ,
                {
                    "LOCALAPPDATA": "C:\\Users\\Alice\\AppData\\Local",
                    "APPDATA": "C:\\Users\\Alice\\AppData\\Roaming",
                },
            ):
                self.assertEqual(
                    "C:\\Users\\Alice\\AppData\\Local",
                    util.get_user_config_directory(),
                )
            with mock.patch.dict(
                os.environ,
                {
                    "LOCALAPPDATA": "",
                    "APPDATA": "C:\\Users\\Alice\\AppData\\Roaming",
                },
            ):
                self.assertEqual(
                    "C:\\Users\\Alice\\AppData\\Roaming",
                    util.get_user_config_directory(),
                )
            with mock.patch.dict(
                os.environ,
                {
                    "LOCALAPPDATA": "",
                    "APPDATA": "",
                },
            ):
                self.assertIsNone(util.get_user_config_directory())

    def test_non_windows(self):
        with mock.patch.dict(os.environ, {"HOME": "/home/alice"}):
            self.assertEqual(
                "/home/alice%s.config" % os.sep,
                util.get_user_config_directory(),
            )
            with mock.patch.dict(
                os.environ, {"XDG_CONFIG_HOME": "/home/alice/configz"}
            ):
                self.assertEqual(
                    "/home/alice/configz", util.get_user_config_directory()
                )


skip_if_windows = unittest.skipIf(os.name == "nt", "Unsupported on Windows")


class MakeFileWithDirectoriesTest(tb_test.TestCase):
    def test_windows_private(self):
        with mock.patch.object(os, "name", "nt"):
            with self.assertRaisesRegex(RuntimeError, "Windows"):
                util.make_file_with_directories("/tmp/foo", private=True)

    def test_existing_file(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        os.makedirs(os.path.dirname(path))
        with open(path, mode="w") as f:
            f.write("foobar")
        util.make_file_with_directories(path)
        with open(path, mode="r") as f:
            self.assertEqual("foobar", f.read())

    def test_existing_dir(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        os.makedirs(os.path.dirname(path))
        util.make_file_with_directories(path)
        self.assertEqual(0, os.path.getsize(path))

    def test_nonexistent_leaf_dir(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        os.makedirs(os.path.dirname(os.path.dirname(path)))
        util.make_file_with_directories(path)
        self.assertEqual(0, os.path.getsize(path))

    def test_nonexistent_multiple_dirs(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        util.make_file_with_directories(path)
        self.assertEqual(0, os.path.getsize(path))

    def assertMode(self, mode, path):
        self.assertEqual(mode, os.stat(path).st_mode & 0o777)

    @skip_if_windows
    def test_private_existing_file(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        os.makedirs(os.path.dirname(path))
        with open(path, mode="w") as f:
            f.write("foobar")
        os.chmod(os.path.dirname(path), 0o777)
        os.chmod(path, 0o666)
        util.make_file_with_directories(path, private=True)
        self.assertMode(0o700, os.path.dirname(path))
        self.assertMode(0o600, path)
        with open(path, mode="r") as f:
            self.assertEqual("foobar", f.read())

    @skip_if_windows
    def test_private_existing_dir(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        os.makedirs(os.path.dirname(path))
        os.chmod(os.path.dirname(path), 0o777)
        util.make_file_with_directories(path, private=True)
        self.assertMode(0o700, os.path.dirname(path))
        self.assertMode(0o600, path)
        self.assertEqual(0, os.path.getsize(path))

    @skip_if_windows
    def test_private_nonexistent_leaf_dir(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        os.makedirs(os.path.dirname(os.path.dirname(path)))
        util.make_file_with_directories(path, private=True)
        self.assertMode(0o700, os.path.dirname(path))
        self.assertMode(0o600, path)
        self.assertEqual(0, os.path.getsize(path))

    @skip_if_windows
    def test_private_nonexistent_multiple_dirs(self):
        root = self.get_temp_dir()
        path = os.path.join(root, "foo", "bar", "qux.txt")
        util.make_file_with_directories(path, private=True)
        self.assertMode(0o700, os.path.dirname(path))
        self.assertMode(0o600, path)
        self.assertEqual(0, os.path.getsize(path))


class SetTimestampTest(tb_test.TestCase):
    def test_set_timestamp(self):
        pb = timestamp_pb2.Timestamp()
        t = 1234567890.007812500
        # Note that just multiplying by 1e9 would lose precision:
        self.assertEqual(int(t * 1e9) % int(1e9), 7812608)
        util.set_timestamp(pb, t)
        self.assertEqual(pb.seconds, 1234567890)
        self.assertEqual(pb.nanos, 7812500)


class FormatTimeTest(tb_test.TestCase):
    def _run(self, t=None, now=None):
        timestamp_pb = timestamp_pb2.Timestamp()
        util.set_timestamp(timestamp_pb, t)
        try:
            with mock.patch.dict(os.environ, {"TZ": "UTC"}):
                time.tzset()
                now = datetime.datetime.fromtimestamp(now)
                return util.format_time(timestamp_pb, now=now)
        finally:
            time.tzset()

    def test_just_now(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 1)
        self.assertEqual(actual, "2019-01-02 03:04:05 (just now)")

    def test_seconds_ago(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 10)
        self.assertEqual(actual, "2019-01-02 03:04:05 (10 seconds ago)")

    def test_minute_ago(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 66)
        self.assertEqual(actual, "2019-01-02 03:04:05 (1 minute ago)")

    def test_minutes_ago(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 222)
        self.assertEqual(actual, "2019-01-02 03:04:05 (3 minutes ago)")

    def test_hour_ago(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 3601)
        self.assertEqual(actual, "2019-01-02 03:04:05 (1 hour ago)")

    def test_hours_ago(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 9999)
        self.assertEqual(actual, "2019-01-02 03:04:05 (2 hours ago)")

    def test_long_ago(self):
        base = 1546398245
        actual = self._run(t=base, now=base + 7 * 86400)
        self.assertEqual(actual, "2019-01-02 03:04:05")


class FormatTimeAbsoluteTest(tb_test.TestCase):
    def _run(self, t=None, tz=None):
        timestamp_pb = timestamp_pb2.Timestamp()
        util.set_timestamp(timestamp_pb, t)
        try:
            with mock.patch.dict(os.environ, {"TZ": tz}):
                time.tzset()
                return util.format_time_absolute(timestamp_pb)
        finally:
            time.tzset()

    def test_in_tz_utc(self):
        t = 981173106
        actual = self._run(t, tz="UTC")
        self.assertEqual(actual, "2001-02-03T04:05:06Z")

    def test_in_tz_nonutc(self):
        # Shouldn't be affected by timezone.
        t = 981173106
        actual = self._run(t, tz="America/Los_Angeles")
        self.assertEqual(actual, "2001-02-03T04:05:06Z")


if __name__ == "__main__":
    tb_test.main()
