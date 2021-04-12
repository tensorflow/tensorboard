# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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


import io
import os

from tensorboard import test as tb_test
from tensorboard.compat.tensorflow_stub import errors
from tensorboard.compat.tensorflow_stub.io import gfile


class GFileTest(tb_test.TestCase):
    def testExists(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model.ckpt")
        self.assertTrue(gfile.exists(temp_dir))
        self.assertTrue(gfile.exists(ckpt_path))

    def testGlob(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        expected = [
            "foo",
            "bar",
            "a.tfevents.1",
            "model.ckpt",
            "quuz",
            "waldo",
        ]
        expected_listing = [os.path.join(temp_dir, f) for f in expected]
        gotten_listing = gfile.glob(os.path.join(temp_dir, "*"))
        self.assertCountEqual(
            expected_listing,
            gotten_listing,
            "Files must match. Expected %r. Got %r."
            % (expected_listing, gotten_listing),
        )

    def testIsdir(self):
        temp_dir = self.get_temp_dir()
        self.assertTrue(gfile.isdir(temp_dir))

    def testListdir(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        expected_files = (
            "foo",
            "bar",
            "quuz",
            "a.tfevents.1",
            "model.ckpt",
            "waldo",
        )
        self.assertCountEqual(expected_files, gfile.listdir(temp_dir))

    def testMakeDirs(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        new_dir = os.path.join(temp_dir, "newdir", "subdir", "subsubdir")
        gfile.makedirs(new_dir)
        self.assertTrue(gfile.isdir(new_dir))

    def testMakeDirsAlreadyExists(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        new_dir = os.path.join(temp_dir, "bar", "baz")
        gfile.makedirs(new_dir)

    def testWalk(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        expected = [
            [
                "",
                [
                    "a.tfevents.1",
                    "model.ckpt",
                ],
            ],
            ["foo", []],
            [
                "bar",
                [
                    "b.tfevents.1",
                    "red_herring.txt",
                ],
            ],
            [
                "bar/baz",
                [
                    "c.tfevents.1",
                    "d.tfevents.1",
                ],
            ],
            [
                "bar/quux",
                [
                    "some_flume_output.txt",
                    "some_more_flume_output.txt",
                ],
            ],
            [
                "quuz",
                [
                    "e.tfevents.1",
                ],
            ],
            [
                "quuz/garply",
                [
                    "f.tfevents.1",
                ],
            ],
            [
                "quuz/garply/corge",
                [
                    "g.tfevents.1",
                ],
            ],
            [
                "quuz/garply/grault",
                [
                    "h.tfevents.1",
                ],
            ],
            ["waldo", []],
            [
                "waldo/fred",
                [
                    "i.tfevents.1",
                ],
            ],
        ]
        for pair in expected:
            # If this is not the top-level directory, prepend the high-level
            # directory.
            pair[0] = (
                os.path.join(temp_dir, pair[0].replace("/", os.path.sep))
                if pair[0]
                else temp_dir
            )
        gotten = gfile.walk(temp_dir)
        self._CompareFilesPerSubdirectory(expected, gotten)

    def testStat(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with open(ckpt_path, "w") as f:
            f.write(ckpt_content)
        ckpt_stat = gfile.stat(ckpt_path)
        self.assertEqual(ckpt_stat.length, len(ckpt_content))
        bad_ckpt_path = os.path.join(temp_dir, "bad_model.ckpt")
        with self.assertRaises(errors.NotFoundError):
            gfile.stat(bad_ckpt_path)

    def testRead(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with open(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testReadLines(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model.ckpt")

        # Note \r\n, which io.read will automatically replace with \n.
        # That substitution desynchronizes character offsets (omitting \r) from
        # the underlying byte offsets (counting \r).  Multibyte characters would
        # similarly cause desynchronization.
        raw_ckpt_lines = (
            ["\r\n"] + ["line {}\r\n".format(i) for i in range(10)] + [" "]
        )
        expected_ckpt_lines = (  # without \r
            ["\n"] + ["line {}\n".format(i) for i in range(10)] + [" "]
        )
        # Write out newlines as given (i.e., \r\n) regardless of OS, so as to
        # test translation on read.
        with io.open(ckpt_path, "w", newline="") as f:
            data = "".join(raw_ckpt_lines)
            f.write(data)
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            read_ckpt_lines = list(f)
            self.assertEqual(expected_ckpt_lines, read_ckpt_lines)

    def testReadWithOffset(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        ckpt_b_content = b"asdfasdfasdffoobarbuzz"
        with open(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            ckpt_read = f.read(12)
            self.assertEqual("asdfasdfasdf", ckpt_read)
            ckpt_read = f.read(6)
            self.assertEqual("foobar", ckpt_read)
            ckpt_read = f.read(1)
            self.assertEqual("b", ckpt_read)
            ckpt_read = f.read()
            self.assertEqual("uzz", ckpt_read)
            ckpt_read = f.read(1000)
            self.assertEqual("", ckpt_read)
        with gfile.GFile(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_b_content, ckpt_read)

    def testWrite(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testOverwrite(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "w") as f:
            f.write("original")
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteMultiple(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz" * 5
        with gfile.GFile(ckpt_path, "w") as f:
            for i in range(0, len(ckpt_content), 3):
                f.write(ckpt_content[i : i + 3])
                # Test periodic flushing of the file
                if i % 9 == 0:
                    f.flush()
        with open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteEmpty(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = ""
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteBinary(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = b"asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "wb") as f:
            f.write(ckpt_content)
        with open(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteMultipleBinary(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = b"asdfasdfasdffoobarbuzz" * 5
        with gfile.GFile(ckpt_path, "wb") as f:
            for i in range(0, len(ckpt_content), 3):
                f.write(ckpt_content[i : i + 3])
                # Test periodic flushing of the file
                if i % 9 == 0:
                    f.flush()
        with open(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def _CreateDeepDirectoryStructure(self, top_directory):
        """Creates a reasonable deep structure of subdirectories with files.

        Args:
          top_directory: The absolute path of the top level directory in
            which to create the directory structure.
        """
        # Add a few subdirectories.
        directory_names = (
            # An empty directory.
            "foo",
            # A directory with an events file (and a text file).
            "bar",
            # A deeper directory with events files.
            "bar/baz",
            # A non-empty subdir that lacks event files (should be ignored).
            "bar/quux",
            # This 3-level deep set of subdirectories tests logic that replaces
            # the full glob string with an absolute path prefix if there is
            # only 1 subdirectory in the final mapping.
            "quuz/garply",
            "quuz/garply/corge",
            "quuz/garply/grault",
            # A directory that lacks events files, but contains a subdirectory
            # with events files (first level should be ignored, second level
            # should be included).
            "waldo",
            "waldo/fred",
        )
        for directory_name in directory_names:
            os.makedirs(os.path.join(top_directory, directory_name))

        # Add a few files to the directory.
        file_names = (
            "a.tfevents.1",
            "model.ckpt",
            "bar/b.tfevents.1",
            "bar/red_herring.txt",
            "bar/baz/c.tfevents.1",
            "bar/baz/d.tfevents.1",
            "bar/quux/some_flume_output.txt",
            "bar/quux/some_more_flume_output.txt",
            "quuz/e.tfevents.1",
            "quuz/garply/f.tfevents.1",
            "quuz/garply/corge/g.tfevents.1",
            "quuz/garply/grault/h.tfevents.1",
            "waldo/fred/i.tfevents.1",
        )
        for file_name in file_names:
            open(os.path.join(top_directory, file_name), "w").close()

    def _CompareFilesPerSubdirectory(self, expected, gotten):
        """Compares iterables of (subdirectory path, list of absolute paths)

        Args:
          expected: The expected iterable of 2-tuples.
          gotten: The gotten iterable of 2-tuples.
        """
        expected_directory_to_files = {
            result[0]: list(result[1]) for result in expected
        }
        gotten_directory_to_files = {
            # Note we ignore subdirectories and just compare files
            result[0]: list(result[2])
            for result in gotten
        }
        self.assertCountEqual(
            expected_directory_to_files.keys(),
            gotten_directory_to_files.keys(),
        )

        for subdir, expected_listing in expected_directory_to_files.items():
            gotten_listing = gotten_directory_to_files[subdir]
            self.assertCountEqual(
                expected_listing,
                gotten_listing,
                "Files for subdir %r must match. Expected %r. Got %r."
                % (subdir, expected_listing, gotten_listing),
            )


if __name__ == "__main__":
    tb_test.main()
