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
"""End-to-end tests for the `deterministic_tar_gz` tool."""


import gzip
import os
import subprocess
import tarfile

from tensorboard import test as tb_test


class DeterministicTarGzTest(tb_test.TestCase):
    def setUp(self):
        self._tool_path = os.path.join(
            os.path.dirname(os.environ["TEST_BINARY"]),
            "deterministic_tar_gz",
        )

    def _run_tool(self, args):
        return subprocess.check_output([self._tool_path] + args)

    def _write_file(self, directory, filename, contents, utime=None):
        """Write a file and set its access and modification times.

        Args:
          directory: Path to parent directory for the file, as a `str`.
          filename: Name of file inside directory, as a `str`.
          contents: File contents, as a `str`.
          utime: If not `None`, a 2-tuple of numbers (`int`s or `float`s)
            representing seconds since epoch for `atime` and `mtime`,
            respectively, as in the second argument to `os.utime`. Defaults
            to a fixed value; the file's timestamps will always be set.

        Returns:
          The new file path.
        """
        filepath = os.path.join(directory, filename)
        with open(filepath, "w") as outfile:
            outfile.write(contents)
        if utime is None:
            utime = (123, 456)
        os.utime(filepath, utime)
        return filepath

    def test_correct_contents(self):
        tempdir = self.get_temp_dir()
        archive = os.path.join(tempdir, "out.tar.gz")
        directory = os.path.join(tempdir, "src")
        os.mkdir(directory)
        self._run_tool(
            [
                archive,
                self._write_file(directory, "1.txt", "one"),
                self._write_file(directory, "2.txt", "two"),
            ]
        )
        with gzip.open(archive) as gzip_file:
            with tarfile.open(fileobj=gzip_file, mode="r:") as tar_file:
                self.assertEqual(
                    tar_file.getnames(), ["1.txt", "2.txt"]
                )  # in order
                self.assertEqual(tar_file.extractfile("1.txt").read(), b"one")
                self.assertEqual(tar_file.extractfile("2.txt").read(), b"two")

    def test_invariant_under_mtime(self):
        tempdir = self.get_temp_dir()

        archive_1 = os.path.join(tempdir, "out_1.tar.gz")
        directory_1 = os.path.join(tempdir, "src_1")
        os.mkdir(directory_1)
        self._run_tool(
            [
                archive_1,
                self._write_file(directory_1, "1.txt", "one", utime=(1, 2)),
                self._write_file(directory_1, "2.txt", "two", utime=(3, 4)),
            ]
        )

        archive_2 = os.path.join(tempdir, "out_2.tar.gz")
        directory_2 = os.path.join(tempdir, "src_2")
        os.mkdir(directory_2)
        self._run_tool(
            [
                archive_2,
                self._write_file(directory_2, "1.txt", "one", utime=(7, 8)),
                self._write_file(directory_2, "2.txt", "two", utime=(5, 6)),
            ]
        )

        with open(archive_1, "rb") as infile:
            archive_1_contents = infile.read()
        with open(archive_2, "rb") as infile:
            archive_2_contents = infile.read()

        self.assertEqual(archive_1_contents, archive_2_contents)

    def test_invariant_under_owner_and_group_names(self):
        self.skipTest("Can't really test this; no way to chown.")


if __name__ == "__main__":
    tb_test.main()
