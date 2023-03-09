# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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


import posixpath

from tensorboard import test as tb_test
from tensorboard.compat.tensorflow_stub import errors
from tensorboard.compat.tensorflow_stub.io import gfile

import fsspec


class GFileFSSpecTest(tb_test.TestCase):
    def get_temp_dir(self):
        return "file://" + super().get_temp_dir()

    def testExists(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model.ckpt")
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
        expected_listing = [posixpath.join(temp_dir, f) for f in expected]
        gotten_listing = gfile.glob(posixpath.join(temp_dir, "*"))
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
        got = gfile.listdir(temp_dir)
        self.assertCountEqual(expected_files, got)

    def testMakeDirs(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        new_dir = posixpath.join(temp_dir, "newdir", "subdir", "subsubdir")
        gfile.makedirs(new_dir)
        self.assertTrue(gfile.isdir(new_dir))

    def testMakeDirsAlreadyExists(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        new_dir = posixpath.join(temp_dir, "bar", "baz")
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
                posixpath.join(temp_dir, pair[0].replace("/", posixpath.sep))
                if pair[0]
                else temp_dir
            )
        gotten = gfile.walk(temp_dir)
        self._CompareFilesPerSubdirectory(expected, gotten)

    def testStat(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with fsspec.open(ckpt_path, "w") as f:
            f.write(ckpt_content)
        ckpt_stat = gfile.stat(ckpt_path)
        self.assertEqual(ckpt_stat.length, len(ckpt_content))
        bad_ckpt_path = posixpath.join(temp_dir, "bad_model.ckpt")
        with self.assertRaises(errors.NotFoundError):
            gfile.stat(bad_ckpt_path)

    def testRead(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with fsspec.open(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testTextMode(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model.ckpt")

        # Write out newlines as given (i.e., \r\n) regardless of OS, so as to
        # test translation on read.
        with fsspec.open(ckpt_path, "w", newline="") as f:
            data = "asdf\nasdf\nasdf\n"
            f.write(data)
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 6  # Test buffering by reducing chunk size
            f.read()
            # TODO (d4l3k): test seeking behavior once
            # https://github.com/intake/filesystem_spec/pull/743 is fixed

    def testReadWithOffset(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        ckpt_b_content = b"asdfasdfasdffoobarbuzz"
        with fsspec.open(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "rb") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            ckpt_read = f.read(12)
            self.assertEqual(b"asdfasdfasdf", ckpt_read)
            ckpt_read = f.read(6)
            self.assertEqual(b"foobar", ckpt_read)
            ckpt_read = f.read(1)
            self.assertEqual(b"b", ckpt_read)
            ckpt_read = f.read()
            self.assertEqual(b"uzz", ckpt_read)
            ckpt_read = f.read(1000)
            self.assertEqual(b"", ckpt_read)
        with gfile.GFile(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_b_content, ckpt_read)

    def testWrite(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with fsspec.open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testOverwrite(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "w") as f:
            f.write("original")
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with fsspec.open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteMultiple(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz" * 5
        with gfile.GFile(ckpt_path, "w") as f:
            for i in range(0, len(ckpt_content), 3):
                f.write(ckpt_content[i : i + 3])
                # Test periodic flushing of the file
                if i % 9 == 0:
                    f.flush()
        with fsspec.open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteEmpty(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model2.ckpt")
        ckpt_content = ""
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with fsspec.open(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteBinary(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model2.ckpt")
        ckpt_content = b"asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "wb") as f:
            f.write(ckpt_content)
        with fsspec.open(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def testWriteMultipleBinary(self):
        temp_dir = self.get_temp_dir()
        self._CreateDeepDirectoryStructure(temp_dir)
        ckpt_path = posixpath.join(temp_dir, "model2.ckpt")
        ckpt_content = b"asdfasdfasdffoobarbuzz" * 5
        with gfile.GFile(ckpt_path, "wb") as f:
            for i in range(0, len(ckpt_content), 3):
                f.write(ckpt_content[i : i + 3])
                # Test periodic flushing of the file
                if i % 9 == 0:
                    f.flush()
        with fsspec.open(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def _CreateDeepDirectoryStructure(self, top_directory):
        """Creates a reasonable deep structure of subdirectories with files.

        Args:
          top_directory: The file:// path of the top level directory in
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
            path = posixpath.join(top_directory, directory_name)
            fs, _, paths = fsspec.get_fs_token_paths(path)
            fs.makedirs(paths[0])

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
            with fsspec.open(
                posixpath.join(top_directory, file_name), "wb"
            ) as f:
                f.write(b"")

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

    def testNonExistentFilesystem(self):
        with self.assertRaises(ValueError):
            gfile.get_filesystem("nonexistent::blah://filesystem")

    def testExistence(self):
        self.assertIsInstance(
            gfile.get_filesystem("simplecache::nonexistent::file://blah/blah"),
            gfile.FSSpecFileSystem,
        )

    def testJoin(self):
        fs = gfile.get_filesystem("file://foo")

        # relative
        self.assertEqual(
            fs.join("bar", "foo", "hi"),
            "bar/foo/hi",
        )
        # absolute with protocol
        self.assertEqual(
            fs.join("file:///bar", "foo", "hi"),
            "file:///bar/foo/hi",
        )
        # empty path element
        self.assertEqual(
            fs.join("file:///bar", "", "hi"),
            "file:///bar/hi",
        )
        # relative with protocol
        self.assertEqual(
            fs.join("file://bar", "foo"),
            "file://bar/foo",
        )
        # chained relative with protocol
        self.assertEqual(
            fs.join("simplecache::file://bucket/some/path", "bar"),
            "simplecache::file://bucket/some/path/bar",
        )
        # chained absolute without protocol
        self.assertEqual(
            fs.join("simplecache::/some/path", "bar"),
            "simplecache::/some/path/bar",
        )
        # absolute second part
        self.assertEqual(
            fs.join("simplecache::/some/path", "/bar"),
            "simplecache::/bar",
        )
        # absolute second part with protocol
        self.assertEqual(
            fs.join("simplecache::file:///some/path", "/bar"),
            "simplecache::file:///bar",
        )
        # trailing /
        self.assertEqual(
            fs.join("simplecache::/some/path/", "bar/", "foo"),
            "simplecache::/some/path/bar/foo",
        )
        # Trailing slash on the last element
        self.assertEqual(
            fs.join("hello", "world/"),
            "hello/world/",
        )
        # empty path at the end
        self.assertEqual(
            fs.join("hello", "world", ""),
            "hello/world/",
        )
        # absolute path in the middle
        self.assertEqual(
            fs.join("hello", "", "world", "", "/wow"),
            "/wow",
        )

    def testComplexChaining(self):
        path = "simplecache::zip://*::file://banana/bar"
        with self.assertRaisesRegex(
            errors.InvalidArgumentError,
            "fsspec URL must only have paths in the last chained filesystem",
        ):
            gfile.exists(path)

    def testGlobChaining(self):
        """
        This tests glob with chained file systems.
        """
        temp_dir = self.get_temp_dir()
        on_disk = temp_dir.split("://")[1]

        with open(posixpath.join(on_disk, "foo.txt"), "wb") as myfile:
            myfile.write(b"foo")

        with open(posixpath.join(on_disk, "bar.txt"), "wb") as myfile:
            myfile.write(b"bar")

        foo_raw = posixpath.join(temp_dir, "foo.txt")
        foo_cached = "simplecache::" + foo_raw

        self.assertTrue(gfile.exists(foo_raw))
        self.assertTrue(gfile.exists(foo_cached))

        cache_dir = "simplecache::" + temp_dir
        files = gfile.glob(posixpath.join(cache_dir, "*.txt"))
        self.assertCountEqual(
            files,
            [
                posixpath.join(cache_dir, "foo.txt"),
                posixpath.join(cache_dir, "bar.txt"),
            ],
        )

    def testGlobChainingNoProtocol(self):
        """
        This tests the glob prefix application when there's no protocol
        specified on the chained path.
        """
        temp_dir = self.get_temp_dir().split("://")[1]

        with open(posixpath.join(temp_dir, "foo.txt"), "wb") as myfile:
            myfile.write(b"foo")

        with open(posixpath.join(temp_dir, "bar.txt"), "wb") as myfile:
            myfile.write(b"bar")

        foo_raw = posixpath.join(temp_dir, "foo.txt")
        foo_cached = "simplecache::" + foo_raw

        fs = gfile.get_filesystem("file://")
        cached_fs = gfile.get_filesystem("simplecache::file://")

        self.assertTrue(fs.exists(foo_raw))
        self.assertTrue(cached_fs.exists(foo_cached))

        cache_dir = "simplecache::" + temp_dir
        files = cached_fs.glob(posixpath.join(cache_dir, "*.txt"))
        self.assertCountEqual(
            files,
            [
                posixpath.join(cache_dir, "foo.txt"),
                posixpath.join(cache_dir, "bar.txt"),
            ],
        )

    def testGlobAbsolute(self):
        """
        This tests glob with in memory file system which does return
        absolute paths from glob.

        Note that this this changed in fsspec==2021.6.0. Prior to this version
        absolute paths were not returned from glob.
        (https://github.com/fsspec/filesystem_spec/pull/654),
        """
        fs = fsspec.filesystem("memory")
        fs.mkdir("dir")
        fs.touch("dir/foo.txt")
        fs.touch("dir/bar.txt")

        root = "memory://dir"

        files = gfile.glob(posixpath.join(root, "*.txt"))
        self.assertCountEqual(
            files,
            [
                "memory:///dir/bar.txt",
                "memory:///dir/foo.txt",
            ],
        )


if __name__ == "__main__":
    tb_test.main()
