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
"""Unit tests for `tensorboard.manager`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import datetime
import errno
import json
import os
import re
import tempfile

import six

try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

from tensorboard import manager
from tensorboard import test as tb_test
from tensorboard import version
from tensorboard.util import tb_logging


def _make_info(i=0):
  """Make a sample TensorBoardInfo object.

  Args:
    i: Seed; vary this value to produce slightly different outputs.

  Returns:
    A type-correct `TensorBoardInfo` object.
  """
  return manager.TensorBoardInfo(
      version=version.VERSION,
      start_time=1548973541 + i,
      port=6060 + i,
      pid=76540 + i,
      path_prefix="/foo",
      logdir="~/my_data/",
      db="",
      cache_key="asdf",
  )


class TensorBoardInfoTest(tb_test.TestCase):
  """Unit tests for TensorBoardInfo typechecking and serialization."""

  def test_roundtrip_serialization(self):
    # This is also tested indirectly as part of `manager` integration
    # tests, in `test_get_all`.
    info = _make_info()
    also_info = manager._info_from_string(manager._info_to_string(info))
    self.assertEqual(also_info, info)

  def test_serialization_rejects_bad_types(self):
    bad_time = datetime.datetime.fromtimestamp(1549061116)  # not an int
    info = _make_info()._replace(start_time=bad_time)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'start_time' of type.*int.*, but found: datetime\."):
      manager._info_to_string(info)

  def test_serialization_rejects_wrong_version(self):
    info = _make_info()._replace(version="reversion")
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'version' to be '.*', but found: 'reversion'"):
      manager._info_to_string(info)

  def test_deserialization_rejects_bad_json(self):
    bad_input = "parse me if you dare"
    with six.assertRaisesRegex(
        self,
        ValueError,
        "invalid JSON:"):
      manager._info_from_string(bad_input)

  def test_deserialization_rejects_non_object_json(self):
    bad_input = "[1, 2]"
    with six.assertRaisesRegex(
        self,
        ValueError,
        re.escape("not a JSON object: [1, 2]")):
      manager._info_from_string(bad_input)

  def test_deserialization_rejects_missing_version(self):
    info = _make_info()
    json_value = json.loads(manager._info_to_string(info))
    del json_value["version"]
    bad_input = json.dumps(json_value)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "incompatible version:"):
      manager._info_from_string(bad_input)

  def test_deserialization_rejects_bad_version(self):
    info = _make_info()
    json_value = json.loads(manager._info_to_string(info))
    json_value["version"] = "not likely"
    bad_input = json.dumps(json_value)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "incompatible version:.*not likely"):
      manager._info_from_string(bad_input)

  def test_deserialization_rejects_extra_keys(self):
    info = _make_info()
    json_value = json.loads(manager._info_to_string(info))
    json_value["unlikely"] = "story"
    bad_input = json.dumps(json_value)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "bad keys on TensorBoardInfo"):
      manager._info_from_string(bad_input)

  def test_deserialization_rejects_missing_keys(self):
    info = _make_info()
    json_value = json.loads(manager._info_to_string(info))
    del json_value["start_time"]
    bad_input = json.dumps(json_value)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "bad keys on TensorBoardInfo"):
      manager._info_from_string(bad_input)

  def test_deserialization_rejects_bad_types(self):
    info = _make_info()
    json_value = json.loads(manager._info_to_string(info))
    json_value["start_time"] = "2001-02-03T04:05:06"
    bad_input = json.dumps(json_value)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'start_time' of type.*int.*, but found:.*"
        "'2001-02-03T04:05:06'"):
      manager._info_from_string(bad_input)

  def test_logdir_data_source_format(self):
    info = _make_info()._replace(logdir="~/foo", db="")
    self.assertEqual(manager.data_source_from_info(info), "logdir ~/foo")

  def test_db_data_source_format(self):
    info = _make_info()._replace(logdir="", db="sqlite:~/bar")
    self.assertEqual(manager.data_source_from_info(info), "db sqlite:~/bar")


class CacheKeyTest(tb_test.TestCase):
  """Unit tests for `manager.cache_key`."""

  def test_result_is_str(self):
    result = manager.cache_key(
        working_directory="/home/me",
        arguments=["--logdir", "something"],
        configure_kwargs={},
    )
    self.assertIsInstance(result, str)

  def test_depends_on_working_directory(self):
    results = [
        manager.cache_key(
            working_directory=d,
            arguments=["--logdir", "something"],
            configure_kwargs={},
        )
        for d in ("/home/me", "/home/you")
    ]
    self.assertEqual(len(results), len(set(results)))

  def test_depends_on_arguments(self):
    results = [
        manager.cache_key(
            working_directory="/home/me",
            arguments=arguments,
            configure_kwargs={},
        )
        for arguments in (
            ["--logdir=something"],
            ["--logdir", "something"],
            ["--logdir", "", "something"],
            ["--logdir", "", "something", ""],
        )
    ]
    self.assertEqual(len(results), len(set(results)))

  def test_depends_on_configure_kwargs(self):
    results = [
        manager.cache_key(
            working_directory="/home/me",
            arguments=[],
            configure_kwargs=configure_kwargs,
        )
        for configure_kwargs in (
            {"logdir": "something"},
            {"logdir": "something_else"},
            {"logdir": "something", "port": "6006"},
        )
    ]
    self.assertEqual(len(results), len(set(results)))

  def test_arguments_and_configure_kwargs_independent(self):
    # This test documents current behavior; its existence shouldn't be
    # interpreted as mandating the behavior. In fact, it would be nice
    # for `arguments` and `configure_kwargs` to be semantically merged
    # in the cache key computation, but we don't currently do that.
    results = [
        manager.cache_key(
            working_directory="/home/me",
            arguments=["--logdir", "something"],
            configure_kwargs={},
        ),
        manager.cache_key(
            working_directory="/home/me",
            arguments=[],
            configure_kwargs={"logdir": "something"},
        ),
    ]
    self.assertEqual(len(results), len(set(results)))

  def test_arguments_list_vs_tuple_irrelevant(self):
    with_list = manager.cache_key(
        working_directory="/home/me",
        arguments=["--logdir", "something"],
        configure_kwargs={},
    )
    with_tuple = manager.cache_key(
        working_directory="/home/me",
        arguments=("--logdir", "something"),
        configure_kwargs={},
    )
    self.assertEqual(with_list, with_tuple)


class TensorBoardInfoIoTest(tb_test.TestCase):
  """Tests for `write_info_file`, `remove_info_file`, and `get_all`."""

  def setUp(self):
    super(TensorBoardInfoIoTest, self).setUp()
    patcher = mock.patch.dict(os.environ, {"TMPDIR": self.get_temp_dir()})
    patcher.start()
    self.addCleanup(patcher.stop)
    tempfile.tempdir = None  # force `gettempdir` to reinitialize from env
    self.info_dir = manager._get_info_dir()  # ensure that directory exists

  def _list_info_dir(self):
    return os.listdir(self.info_dir)

  def assertMode(self, path, expected):
    """Assert that the permission bits of a file are as expected.

    Args:
      path: File to stat.
      expected: `int`; a subset of 0o777.

    Raises:
      AssertionError: If the permissions bits of `path` do not match
        `expected`.
    """
    stat_result = os.stat(path)
    format_mode = lambda m: "0o%03o" % m
    self.assertEqual(
        format_mode(stat_result.st_mode & 0o777),
        format_mode(expected),
    )

  def test_fails_if_info_dir_name_is_taken_by_a_regular_file(self):
    os.rmdir(self.info_dir)
    with open(self.info_dir, "w") as outfile:
      pass
    with self.assertRaises(OSError) as cm:
      manager._get_info_dir()
    self.assertEqual(cm.exception.errno, errno.EEXIST, cm.exception)

  @mock.patch("os.getpid", lambda: 76540)
  def test_directory_world_accessible(self):
    """Test that the TensorBoardInfo directory is world-accessible.

    Regression test for issue #2010:
    <https://github.com/tensorflow/tensorboard/issues/2010>
    """
    if os.name == "nt":
      self.skipTest("Windows does not use POSIX-style permissions.")
    os.rmdir(self.info_dir)
    # The default umask is typically 0o022, in which case this test is
    # nontrivial. In the unlikely case that the umask is 0o000, we'll
    # still be covered by the "restrictive umask" test case below.
    manager.write_info_file(_make_info())
    self.assertMode(self.info_dir, 0o777)
    self.assertEqual(self._list_info_dir(), ["pid-76540.info"])

  @mock.patch("os.getpid", lambda: 76540)
  def test_writing_file_with_restrictive_umask(self):
    if os.name == "nt":
      self.skipTest("Windows does not use POSIX-style permissions.")
    os.rmdir(self.info_dir)
    # Even if umask prevents owner-access, our I/O should still work.
    old_umask = os.umask(0o777)
    try:
      # Sanity-check that, without special accommodation, this would
      # create inaccessible directories...
      sanity_dir = os.path.join(self.get_temp_dir(), "canary")
      os.mkdir(sanity_dir)
      self.assertMode(sanity_dir, 0o000)

      manager.write_info_file(_make_info())
      self.assertMode(self.info_dir, 0o777)
      self.assertEqual(self._list_info_dir(), ["pid-76540.info"])
    finally:
      self.assertEqual(oct(os.umask(old_umask)), oct(0o777))

  @mock.patch("os.getpid", lambda: 76540)
  def test_write_remove_info_file(self):
    info = _make_info()
    self.assertEqual(self._list_info_dir(), [])
    manager.write_info_file(info)
    filename = "pid-76540.info"
    expected_filepath = os.path.join(self.info_dir, filename)
    self.assertEqual(self._list_info_dir(), [filename])
    with open(expected_filepath) as infile:
      self.assertEqual(manager._info_from_string(infile.read()), info)
    manager.remove_info_file()
    self.assertEqual(self._list_info_dir(), [])

  def test_write_info_file_rejects_bad_types(self):
    # The particulars of validation are tested more thoroughly in
    # `TensorBoardInfoTest` above.
    bad_time = datetime.datetime.fromtimestamp(1549061116)
    info = _make_info()._replace(start_time=bad_time)
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'start_time' of type.*int.*, but found: datetime\."):
      manager.write_info_file(info)
    self.assertEqual(self._list_info_dir(), [])

  def test_write_info_file_rejects_wrong_version(self):
    # The particulars of validation are tested more thoroughly in
    # `TensorBoardInfoTest` above.
    info = _make_info()._replace(version="reversion")
    with six.assertRaisesRegex(
        self,
        ValueError,
        "expected 'version' to be '.*', but found: 'reversion'"):
      manager.write_info_file(info)
    self.assertEqual(self._list_info_dir(), [])

  def test_remove_nonexistent(self):
    # Should be a no-op, except to create the info directory if
    # necessary. In particular, should not raise any exception.
    manager.remove_info_file()

  def test_get_all(self):
    def add_info(i):
      with mock.patch("os.getpid", lambda: 76540 + i):
        manager.write_info_file(_make_info(i))
    def remove_info(i):
      with mock.patch("os.getpid", lambda: 76540 + i):
        manager.remove_info_file()
    self.assertItemsEqual(manager.get_all(), [])
    add_info(1)
    self.assertItemsEqual(manager.get_all(), [_make_info(1)])
    add_info(2)
    self.assertItemsEqual(manager.get_all(), [_make_info(1), _make_info(2)])
    remove_info(1)
    self.assertItemsEqual(manager.get_all(), [_make_info(2)])
    add_info(3)
    self.assertItemsEqual(manager.get_all(), [_make_info(2), _make_info(3)])
    remove_info(3)
    self.assertItemsEqual(manager.get_all(), [_make_info(2)])
    remove_info(2)
    self.assertItemsEqual(manager.get_all(), [])

  def test_get_all_ignores_bad_files(self):
    with open(os.path.join(self.info_dir, "pid-1234.info"), "w") as outfile:
      outfile.write("good luck parsing this\n")
    with open(os.path.join(self.info_dir, "pid-5678.info"), "w") as outfile:
      outfile.write('{"valid_json":"yes","valid_tbinfo":"no"}\n')
    with open(os.path.join(self.info_dir, "pid-9012.info"), "w") as outfile:
      outfile.write('if a tbinfo has st_mode==0, does it make a sound?\n')
    os.chmod(os.path.join(self.info_dir, "pid-9012.info"), 0o000)
    with mock.patch.object(tb_logging.get_logger(), "warning") as fn:
      self.assertEqual(manager.get_all(), [])
    self.assertEqual(fn.call_count, 2)  # 2 invalid, 1 unreadable (silent)


if __name__ == "__main__":
  tb_test.main()
