# This Python file uses the following encoding: utf-8
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
# =============================================================================
"""Testing File IO operations in gfile.py."""


import os.path


from tensorboard import test as tb_test
from tensorboard.compat.tensorflow_stub import compat, errors
from tensorboard.compat.tensorflow_stub.io import gfile

# These tests are forked from
# https://github.com/tensorflow/tensorflow/blob/0bd715841dba30157beb6ca59f1024ba8cad2f92/tensorflow/python/lib/io/file_io_test.py

# The purpose is to establish that our GFile reimplementation is faithful to
# the TensorFlow FileIO API (to the extent that it's implemented at all).
# Many of the TF tests are removed because they do not apply here.


class FileIoTest(tb_test.TestCase):
    def setUp(self):
        self._base_dir = os.path.join(self.get_temp_dir(), "base_dir")
        gfile.makedirs(self._base_dir)

    # It was a temp_dir anyway
    # def tearDown(self):
    #  gfile.delete_recursively(self._base_dir)

    def testEmptyFilename(self):
        f = gfile.GFile("", mode="r")
        with self.assertRaises(errors.NotFoundError):
            _ = f.read()

    def testFileDoesntExist(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        self.assertFalse(gfile.exists(file_path))
        with self.assertRaises(errors.NotFoundError):
            _ = gfile._read_file_to_string(file_path)

    def testWriteToString(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        gfile._write_string_to_file(file_path, "testing")
        self.assertTrue(gfile.exists(file_path))
        file_contents = gfile._read_file_to_string(file_path)
        self.assertEqual("testing", file_contents)

    def testReadBinaryMode(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        gfile._write_string_to_file(file_path, "testing")
        with gfile.GFile(file_path, mode="rb") as f:
            self.assertEqual(b"testing", f.read())

    def testWriteBinaryMode(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        gfile.GFile(file_path, "wb").write(compat.as_bytes("testing"))
        with gfile.GFile(file_path, mode="r") as f:
            self.assertEqual("testing", f.read())

    def testMultipleFiles(self):
        file_prefix = os.path.join(self._base_dir, "temp_file")
        for i in range(5000):

            with gfile.GFile(file_prefix + str(i), mode="w") as f:
                f.write("testing")
                f.flush()

            with gfile.GFile(file_prefix + str(i), mode="r") as f:
                self.assertEqual("testing", f.read())

    def testMultipleWrites(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        with gfile.GFile(file_path, mode="w") as f:
            f.write("line1\n")
            f.write("line2")
        file_contents = gfile._read_file_to_string(file_path)
        self.assertEqual("line1\nline2", file_contents)

    def testFileWriteBadMode(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        with self.assertRaises(errors.PermissionDeniedError):
            gfile.GFile(file_path, mode="r").write("testing")

    def testFileReadBadMode(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        gfile.GFile(file_path, mode="w").write("testing")
        self.assertTrue(gfile.exists(file_path))
        with self.assertRaises(errors.PermissionDeniedError):
            gfile.GFile(file_path, mode="w").read()

    def testIsDirectory(self):
        dir_path = os.path.join(self._base_dir, "test_dir")
        # Failure for a non-existing dir.
        self.assertFalse(gfile.isdir(dir_path))
        gfile.makedirs(dir_path)
        self.assertTrue(gfile.isdir(dir_path))
        file_path = os.path.join(dir_path, "test_file")
        gfile.GFile(file_path, mode="w").write("test")
        # False for a file.
        self.assertFalse(gfile.isdir(file_path))
        # Test that the value returned from `stat()` has `is_directory` set.
        # file_statistics = gfile.stat(dir_path)
        # self.assertTrue(file_statistics.is_directory)

    def testListDirectory(self):
        dir_path = os.path.join(self._base_dir, "test_dir")
        gfile.makedirs(dir_path)
        files = ["file1.txt", "file2.txt", "file3.txt"]
        for name in files:
            file_path = os.path.join(dir_path, name)
            gfile.GFile(file_path, mode="w").write("testing")
        subdir_path = os.path.join(dir_path, "sub_dir")
        gfile.makedirs(subdir_path)
        subdir_file_path = os.path.join(subdir_path, "file4.txt")
        gfile.GFile(subdir_file_path, mode="w").write("testing")
        dir_list = gfile.listdir(dir_path)
        self.assertCountEqual(files + ["sub_dir"], dir_list)

    def testListDirectoryFailure(self):
        dir_path = os.path.join(self._base_dir, "test_dir")
        with self.assertRaises(errors.NotFoundError):
            gfile.listdir(dir_path)

    def _setupWalkDirectories(self, dir_path):
        # Creating a file structure as follows
        # test_dir -> file: file1.txt; dirs: subdir1_1, subdir1_2, subdir1_3
        # subdir1_1 -> file: file3.txt
        # subdir1_2 -> dir: subdir2
        gfile.makedirs(dir_path)
        gfile.GFile(os.path.join(dir_path, "file1.txt"), mode="w").write(
            "testing"
        )
        sub_dirs1 = ["subdir1_1", "subdir1_2", "subdir1_3"]
        for name in sub_dirs1:
            gfile.makedirs(os.path.join(dir_path, name))
        gfile.GFile(
            os.path.join(dir_path, "subdir1_1/file2.txt"), mode="w"
        ).write("testing")
        gfile.makedirs(os.path.join(dir_path, "subdir1_2/subdir2"))

    def testWalkInOrder(self):
        dir_path = os.path.join(self._base_dir, "test_dir")
        self._setupWalkDirectories(dir_path)
        # Now test the walk (topdown = True)
        all_dirs = []
        all_subdirs = []
        all_files = []
        for w_dir, w_subdirs, w_files in gfile.walk(dir_path, topdown=True):
            all_dirs.append(w_dir)
            all_subdirs.append(w_subdirs)
            all_files.append(w_files)
        self.assertCountEqual(
            all_dirs,
            [dir_path]
            + [
                os.path.join(dir_path, item)
                for item in [
                    "subdir1_1",
                    "subdir1_2",
                    "subdir1_2/subdir2",
                    "subdir1_3",
                ]
            ],
        )
        self.assertEqual(dir_path, all_dirs[0])
        self.assertLess(
            all_dirs.index(os.path.join(dir_path, "subdir1_2")),
            all_dirs.index(os.path.join(dir_path, "subdir1_2/subdir2")),
        )
        self.assertCountEqual(all_subdirs[1:5], [[], ["subdir2"], [], []])
        self.assertCountEqual(
            all_subdirs[0], ["subdir1_1", "subdir1_2", "subdir1_3"]
        )
        self.assertCountEqual(
            all_files, [["file1.txt"], ["file2.txt"], [], [], []]
        )
        self.assertLess(
            all_files.index(["file1.txt"]), all_files.index(["file2.txt"])
        )

    def testWalkPostOrder(self):
        dir_path = os.path.join(self._base_dir, "test_dir")
        self._setupWalkDirectories(dir_path)
        # Now test the walk (topdown = False)
        all_dirs = []
        all_subdirs = []
        all_files = []
        for w_dir, w_subdirs, w_files in gfile.walk(dir_path, topdown=False):
            all_dirs.append(w_dir)
            all_subdirs.append(w_subdirs)
            all_files.append(w_files)
        self.assertCountEqual(
            all_dirs,
            [
                os.path.join(dir_path, item)
                for item in [
                    "subdir1_1",
                    "subdir1_2/subdir2",
                    "subdir1_2",
                    "subdir1_3",
                ]
            ]
            + [dir_path],
        )
        self.assertEqual(dir_path, all_dirs[4])
        self.assertLess(
            all_dirs.index(os.path.join(dir_path, "subdir1_2/subdir2")),
            all_dirs.index(os.path.join(dir_path, "subdir1_2")),
        )
        self.assertCountEqual(all_subdirs[0:4], [[], [], ["subdir2"], []])
        self.assertCountEqual(
            all_subdirs[4], ["subdir1_1", "subdir1_2", "subdir1_3"]
        )
        self.assertCountEqual(
            all_files, [["file2.txt"], [], [], [], ["file1.txt"]]
        )
        self.assertLess(
            all_files.index(["file2.txt"]), all_files.index(["file1.txt"])
        )

    def testWalkFailure(self):
        dir_path = os.path.join(self._base_dir, "test_dir")
        # Try walking a directory that wasn't created.
        all_dirs = []
        all_subdirs = []
        all_files = []
        for w_dir, w_subdirs, w_files in gfile.walk(dir_path, topdown=False):
            all_dirs.append(w_dir)
            all_subdirs.append(w_subdirs)
            all_files.append(w_files)
        self.assertCountEqual(all_dirs, [])
        self.assertCountEqual(all_subdirs, [])
        self.assertCountEqual(all_files, [])

    def testStat(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        gfile.GFile(file_path, mode="w").write("testing")
        file_statistics = gfile.stat(file_path)
        os_statistics = os.stat(file_path)
        self.assertEqual(7, file_statistics.length)

    def testRead(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        with gfile.GFile(file_path, mode="w") as f:
            f.write("testing1\ntesting2\ntesting3\n\ntesting5")
        with gfile.GFile(file_path, mode="r") as f:
            self.assertEqual(36, gfile.stat(file_path).length)
            self.assertEqual("testing1\n", f.read(9))
            self.assertEqual("testing2\n", f.read(9))
            self.assertEqual("t", f.read(1))
            self.assertEqual("esting3\n\ntesting5", f.read())

    def testReadingIterator(self):
        file_path = os.path.join(self._base_dir, "temp_file")
        data = ["testing1\n", "testing2\n", "testing3\n", "\n", "testing5"]
        with gfile.GFile(file_path, mode="w") as f:
            f.write("".join(data))
        with gfile.GFile(file_path, mode="r") as f:
            actual_data = []
            for line in f:
                actual_data.append(line)
            self.assertSequenceEqual(actual_data, data)

    def testUTF8StringPath(self):
        file_path = os.path.join(self._base_dir, "UTF8测试_file")
        gfile._write_string_to_file(file_path, "testing")
        with gfile.GFile(file_path, mode="rb") as f:
            self.assertEqual(b"testing", f.read())

    def testEof(self):
        """Test that reading past EOF does not raise an exception."""

        file_path = os.path.join(self._base_dir, "temp_file")

        with gfile.GFile(file_path, mode="w") as f:
            content = "testing"
            f.write(content)
            f.flush()
        with gfile.GFile(file_path, mode="r") as f:
            self.assertEqual(content, f.read(len(content) + 1))

    def testUTF8StringPathExists(self):
        file_path = os.path.join(self._base_dir, "UTF8测试_file_exist")
        gfile._write_string_to_file(file_path, "testing")
        v = gfile.exists(file_path)
        self.assertEqual(v, True)


if __name__ == "__main__":
    tb_test.main()
