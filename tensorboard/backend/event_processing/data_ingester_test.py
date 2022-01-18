# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for data_ingester package."""

import ntpath
import os
import posixpath
import time
from unittest import mock

from tensorboard import test as tb_test
from tensorboard.backend.event_processing import data_ingester
from tensorboard.compat import tf


_ORIGINAL_IMPORT = __import__
_TENSORFLOW_IO_MODULE = "tensorflow_io"


class FakeFlags(object):
    def __init__(
        self,
        logdir,
        logdir_spec="",
        purge_orphaned_data=True,
        reload_interval=60,
        samples_per_plugin=None,
        max_reload_threads=1,
        reload_task="auto",
        window_title="",
        path_prefix="",
        reload_multifile=False,
        reload_multifile_inactive_secs=4000,
        generic_data="auto",
    ):
        self.logdir = logdir
        self.logdir_spec = logdir_spec
        self.purge_orphaned_data = purge_orphaned_data
        self.reload_interval = reload_interval
        self.samples_per_plugin = samples_per_plugin or {}
        self.max_reload_threads = max_reload_threads
        self.reload_task = reload_task
        self.window_title = window_title
        self.path_prefix = path_prefix
        self.reload_multifile = reload_multifile
        self.reload_multifile_inactive_secs = reload_multifile_inactive_secs
        self.generic_data = generic_data


class GetEventFileActiveFilterTest(tb_test.TestCase):
    def testDisabled(self):
        flags = FakeFlags("logdir", reload_multifile=False)
        self.assertIsNone(data_ingester._get_event_file_active_filter(flags))

    def testInactiveSecsZero(self):
        flags = FakeFlags(
            "logdir", reload_multifile=True, reload_multifile_inactive_secs=0
        )
        self.assertIsNone(data_ingester._get_event_file_active_filter(flags))

    def testInactiveSecsNegative(self):
        flags = FakeFlags(
            "logdir", reload_multifile=True, reload_multifile_inactive_secs=-1
        )
        filter_fn = data_ingester._get_event_file_active_filter(flags)
        self.assertTrue(filter_fn(0))
        self.assertTrue(filter_fn(time.time()))
        self.assertTrue(filter_fn(float("inf")))

    def testInactiveSecs(self):
        flags = FakeFlags(
            "logdir", reload_multifile=True, reload_multifile_inactive_secs=10
        )
        filter_fn = data_ingester._get_event_file_active_filter(flags)
        with mock.patch.object(time, "time") as mock_time:
            mock_time.return_value = 100
            self.assertFalse(filter_fn(0))
            self.assertFalse(filter_fn(time.time() - 11))
            self.assertTrue(filter_fn(time.time() - 10))
            self.assertTrue(filter_fn(time.time()))
            self.assertTrue(filter_fn(float("inf")))


class ParseEventFilesSpecTest(tb_test.TestCase):
    def assertPlatformSpecificLogdirParsing(self, pathObj, logdir, expected):
        """A custom assertion to test :func:`parse_event_files_spec` under
        various systems.

        Args:
            pathObj: a custom replacement object for `os.path`, typically
              `posixpath` or `ntpath`
            logdir: the string to be parsed by
              :func:`~data_ingester._parse_event_files_spec`
            expected: the expected dictionary as returned by
              :func:`~data_ingester._parse_event_files_spec`
        """

        with mock.patch("os.path", pathObj):
            self.assertEqual(
                data_ingester._parse_event_files_spec(logdir), expected
            )

    def testBasic(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "/lol/cat", {"/lol/cat": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, r"C:\lol\cat", {r"C:\lol\cat": None}
        )

    def testRunName(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "lol:/cat", {"/cat": "lol"}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "lol:C:\\cat", {"C:\\cat": "lol"}
        )

    def testPathWithColonThatComesAfterASlash_isNotConsideredARunName(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "/lol:/cat", {"/lol:/cat": None}
        )

    def testExpandsUser(self):
        # USERPROFILE is used for simulating Python 3.8 on Windows.
        old_home = os.environ.get("HOME", None)
        old_userprofile = os.environ.get("USERPROFILE", None)
        try:
            test_home_directory = "/usr/eliza"
            os.environ["HOME"] = test_home_directory
            self.assertPlatformSpecificLogdirParsing(
                posixpath, "~/lol/cat~dog", {"/usr/eliza/lol/cat~dog": None}
            )
            test_home_directory = r"C:\Users\eliza"
            os.environ["HOME"] = test_home_directory
            os.environ["USERPROFILE"] = test_home_directory
            self.assertPlatformSpecificLogdirParsing(
                ntpath, r"~\lol\cat~dog", {r"C:\Users\eliza\lol\cat~dog": None}
            )
        finally:
            if old_home is not None:
                os.environ["HOME"] = old_home
            if old_userprofile is not None:
                os.environ["USERPROFILE"] = old_userprofile

    def testExpandsUserForMultipleDirectories(self):
        # USERPROFILE is used for simulating Python 3.8 on Windows.
        old_home = os.environ.get("HOME", None)
        old_userprofile = os.environ.get("USERPROFILE", None)
        try:
            test_home_directory = "/usr/eliza"
            os.environ["HOME"] = test_home_directory
            self.assertPlatformSpecificLogdirParsing(
                posixpath,
                "a:~/lol,b:~/cat",
                {"/usr/eliza/lol": "a", "/usr/eliza/cat": "b"},
            )
            test_home_directory = r"C:\Users\eliza"
            os.environ["HOME"] = test_home_directory
            os.environ["USERPROFILE"] = test_home_directory
            self.assertPlatformSpecificLogdirParsing(
                ntpath,
                r"aa:~\lol,bb:~\cat",
                {r"C:\Users\eliza\lol": "aa", r"C:\Users\eliza\cat": "bb"},
            )
        finally:
            if old_home is not None:
                os.environ["HOME"] = old_home
            if old_userprofile is not None:
                os.environ["USERPROFILE"] = old_userprofile

    def testMultipleDirectories(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "/a,/b", {"/a": None, "/b": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "C:\\a,C:\\b", {"C:\\a": None, "C:\\b": None}
        )

    def testNormalizesPaths(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "/lol/.//cat/../cat", {"/lol/cat": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "C:\\lol\\.\\\\cat\\..\\cat", {"C:\\lol\\cat": None}
        )

    def testAbsolutifies(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "lol/cat", {posixpath.realpath("lol/cat"): None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "lol\\cat", {ntpath.realpath("lol\\cat"): None}
        )

    def testRespectsGCSPath(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "gs://foo/path", {"gs://foo/path": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "gs://foo/path", {"gs://foo/path": None}
        )

    def testRespectsHDFSPath(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "hdfs://foo/path", {"hdfs://foo/path": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "hdfs://foo/path", {"hdfs://foo/path": None}
        )

    def testDoesNotExpandUserInGCSPath(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "gs://~/foo/path", {"gs://~/foo/path": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "gs://~/foo/path", {"gs://~/foo/path": None}
        )

    def testDoesNotNormalizeGCSPath(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "gs://foo/./path//..", {"gs://foo/./path//..": None}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "gs://foo/./path//..", {"gs://foo/./path//..": None}
        )

    def testRunNameWithGCSPath(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "lol:gs://foo/path", {"gs://foo/path": "lol"}
        )
        self.assertPlatformSpecificLogdirParsing(
            ntpath, "lol:gs://foo/path", {"gs://foo/path": "lol"}
        )

    def testSingleLetterGroup(self):
        self.assertPlatformSpecificLogdirParsing(
            posixpath, "A:/foo/path", {"/foo/path": "A"}
        )
        # single letter groups are not supported on Windows
        with self.assertRaises(AssertionError):
            self.assertPlatformSpecificLogdirParsing(
                ntpath, "A:C:\\foo\\path", {"C:\\foo\\path": "A"}
            )


class FileSystemSupportTest(tb_test.TestCase):
    def fake_import(self, affected_name, success=True):
        """Fakes import for a given module."""

        def fake(name, *args, **kwargs):
            if name == affected_name:
                if success:
                    return
                else:
                    raise ImportError("Pretending I'm missing ;)")
            return _ORIGINAL_IMPORT(name, *args, **kwargs)

        return fake

    def testCheckFilesystemSupport(self):
        with mock.patch.object(
            tf.io.gfile,
            "get_registered_schemes",
            autospec=True,
            return_value=["g3", "s3"],
        ) as mock_get_registered_schemes:
            with mock.patch(
                "builtins.__import__",
                side_effect=self.fake_import(
                    _TENSORFLOW_IO_MODULE, success=True
                ),
            ) as mock_import:
                data_ingester._check_filesystem_support(
                    ["tmp/demo", "s3://bucket/123"]
                )
        mock_import.assert_not_called()
        mock_get_registered_schemes.assert_called_once()

    def testCheckFilesystemSupport_importTFIO(self):
        # autospec=True doesn't work for this test internally.
        with mock.patch.object(
            tf.io.gfile,
            "get_registered_schemes",
            return_value=["file", ""],
        ) as mock_get_registered_schemes:
            with mock.patch(
                "builtins.__import__",
                side_effect=self.fake_import(
                    _TENSORFLOW_IO_MODULE, success=True
                ),
            ) as mock_import:
                data_ingester._check_filesystem_support(
                    ["tmp/demo", "s3://bucket/123"]
                )
        self.assertEqual("tensorflow_io", mock_import.call_args[0][0])
        mock_get_registered_schemes.assert_called_once()

    def testCheckFilesystemSupport_raiseError(self):
        # autospec=True doesn't work for this test internally.
        with mock.patch.object(
            tf.io.gfile,
            "get_registered_schemes",
            return_value=["file", "ram"],
        ) as mock_get_registered_schemes:
            with mock.patch(
                "builtins.__import__",
                side_effect=self.fake_import(
                    _TENSORFLOW_IO_MODULE, success=False
                ),
            ) as mock_import:
                err_msg = (
                    "Error: Unsupported filename scheme 's3' (supported schemes: ['file', 'ram'])."
                    + " For additional filesystem support, consider installing TensorFlow I/O"
                    + " (https://www.tensorflow.org/io) via `pip install tensorflow-io`."
                )
                with self.assertRaisesWithLiteralMatch(
                    tf.errors.UnimplementedError, err_msg
                ):
                    data_ingester._check_filesystem_support(
                        ["tmp/demo", "s3://bucket/123"]
                    )
        self.assertEqual("tensorflow_io", mock_import.call_args[0][0])
        mock_get_registered_schemes.assert_called_once()

    def testCheckFilesystemSupport_fallback(self):
        with mock.patch.object(tf.io, "gfile", autospec=True) as mock_gfile:
            del mock_gfile.get_registered_schemes
            with mock.patch(
                "builtins.__import__",
                side_effect=self.fake_import(
                    _TENSORFLOW_IO_MODULE, success=True
                ),
            ) as mock_import:
                mock_gfile.exists.return_value = True
                data_ingester._check_filesystem_support(["gs://bucket/abc"])
        mock_import.assert_not_called()
        mock_gfile.exists.assert_called_once_with("gs://bucket/abc")

    def testCheckFilesystemSupport_fallback_raiseError(self):
        with mock.patch.object(tf.io, "gfile", autospec=True) as mock_gfile:
            del mock_gfile.get_registered_schemes
            with mock.patch(
                "builtins.__import__",
                side_effect=self.fake_import(
                    _TENSORFLOW_IO_MODULE, success=False
                ),
            ) as mock_import:
                mock_gfile.exists.side_effect = tf.errors.UnimplementedError(
                    None, None, "oops"
                )
                err_msg = (
                    "Error: Unsupported filename scheme 'gs'."
                    + " For additional filesystem support, consider installing TensorFlow I/O"
                    + " (https://www.tensorflow.org/io) via `pip install tensorflow-io`."
                )
                with self.assertRaisesWithLiteralMatch(
                    tf.errors.UnimplementedError, err_msg
                ):
                    data_ingester._check_filesystem_support(["gs://bucket/abc"])
        self.assertEqual("tensorflow_io", mock_import.call_args[0][0])
        mock_gfile.exists.assert_called_once_with("gs://bucket/abc")

    def testCheckFilesystemSupport_Called(self):
        with mock.patch.object(tf, "__version__", new="2.2.2"):
            with mock.patch.object(
                data_ingester, "_check_filesystem_support", autospec=True
            ) as mock_check_filesystem_support:
                data_ingester.LocalDataIngester(flags=FakeFlags("logdir"))
        mock_check_filesystem_support.assert_called_once_with({"logdir"})

    def testCheckFilesystemSupport_notCalled(self):
        with mock.patch.object(tf, "__version__", new="stub"):
            with mock.patch.object(
                data_ingester, "_check_filesystem_support", autospec=True
            ) as mock_check_filesystem_support:
                data_ingester.LocalDataIngester(flags=FakeFlags("logdir"))
        mock_check_filesystem_support.assert_not_called()


if __name__ == "__main__":
    tb_test.main()
