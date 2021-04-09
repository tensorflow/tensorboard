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


import boto3
import os
import unittest
from moto import mock_s3

from tensorboard.compat.tensorflow_stub import errors
from tensorboard.compat.tensorflow_stub.io import gfile

# Placeholder values to make sure any local keys are overridden
# and moto mock is being called
os.environ.setdefault("AWS_ACCESS_KEY_ID", "foobar_key")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "foobar_secret")


class GFileTest(unittest.TestCase):
    @mock_s3
    def testExists(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = self._PathJoin(temp_dir, "model.ckpt")
        self.assertTrue(gfile.exists(temp_dir))
        self.assertTrue(gfile.exists(ckpt_path))

    @mock_s3
    def testGlob(self):
        temp_dir = self._CreateDeepS3Structure()
        # S3 glob includes subdirectory content, which standard
        # filesystem does not. However, this is good for perf.
        expected = [
            "a.tfevents.1",
            "bar/b.tfevents.1",
            "bar/baz/c.tfevents.1",
            "bar/baz/d.tfevents.1",
            "bar/quux/some_flume_output.txt",
            "bar/quux/some_more_flume_output.txt",
            "bar/red_herring.txt",
            "model.ckpt",
            "quuz/e.tfevents.1",
            "quuz/garply/corge/g.tfevents.1",
            "quuz/garply/f.tfevents.1",
            "quuz/garply/grault/h.tfevents.1",
            "waldo/fred/i.tfevents.1",
        ]
        expected_listing = [self._PathJoin(temp_dir, f) for f in expected]
        gotten_listing = gfile.glob(self._PathJoin(temp_dir, "*"))
        self.assertCountEqual(
            expected_listing,
            gotten_listing,
            "Files must match. Expected %r. Got %r."
            % (expected_listing, gotten_listing),
        )

    @mock_s3
    def testIsdir(self):
        temp_dir = self._CreateDeepS3Structure()
        self.assertTrue(gfile.isdir(temp_dir))

    @mock_s3
    def testListdir(self):
        temp_dir = self._CreateDeepS3Structure()
        self._CreateDeepS3Structure(temp_dir)
        expected_files = [
            # Empty directory not returned
            # 'foo',
            "bar",
            "quuz",
            "a.tfevents.1",
            "model.ckpt",
            "waldo",
        ]
        gotten_files = gfile.listdir(temp_dir)
        self.assertCountEqual(expected_files, gotten_files)

    @mock_s3
    def testMakeDirs(self):
        temp_dir = self._CreateDeepS3Structure()
        new_dir = self._PathJoin(temp_dir, "newdir", "subdir", "subsubdir")
        gfile.makedirs(new_dir)
        self.assertTrue(gfile.isdir(new_dir))

    @mock_s3
    def testMakeDirsAlreadyExists(self):
        temp_dir = self._CreateDeepS3Structure()
        new_dir = self._PathJoin(temp_dir, "bar", "baz")
        gfile.makedirs(new_dir)

    @mock_s3
    def testWalk(self):
        temp_dir = self._CreateDeepS3Structure()
        self._CreateDeepS3Structure(temp_dir)
        expected = [
            [
                "",
                [
                    "a.tfevents.1",
                    "model.ckpt",
                ],
            ],
            # Empty directory not returned
            # ['foo', []],
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
            pair[0] = self._PathJoin(temp_dir, pair[0]) if pair[0] else temp_dir
        gotten = gfile.walk(temp_dir)
        self._CompareFilesPerSubdirectory(expected, gotten)

    @mock_s3
    def testStat(self):
        ckpt_content = "asdfasdfasdffoobarbuzz"
        temp_dir = self._CreateDeepS3Structure(ckpt_content=ckpt_content)
        ckpt_path = self._PathJoin(temp_dir, "model.ckpt")
        ckpt_stat = gfile.stat(ckpt_path)
        self.assertEqual(ckpt_stat.length, len(ckpt_content))
        bad_ckpt_path = self._PathJoin(temp_dir, "bad_model.ckpt")
        with self.assertRaises(errors.NotFoundError):
            gfile.stat(bad_ckpt_path)

    @mock_s3
    def testRead(self):
        ckpt_content = "asdfasdfasdffoobarbuzz"
        temp_dir = self._CreateDeepS3Structure(ckpt_content=ckpt_content)
        ckpt_path = self._PathJoin(temp_dir, "model.ckpt")
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    @mock_s3
    def testReadLines(self):
        ckpt_lines = ["\n"] + ["line {}\n".format(i) for i in range(10)] + [" "]
        ckpt_content = "".join(ckpt_lines)
        temp_dir = self._CreateDeepS3Structure(ckpt_content=ckpt_content)
        ckpt_path = self._PathJoin(temp_dir, "model.ckpt")
        with gfile.GFile(ckpt_path, "r") as f:
            f.buff_chunk_size = 4  # Test buffering by reducing chunk size
            ckpt_read_lines = list(f)
            self.assertEqual(ckpt_lines, ckpt_read_lines)

    @mock_s3
    def testReadWithOffset(self):
        ckpt_content = "asdfasdfasdffoobarbuzz"
        ckpt_b_content = b"asdfasdfasdffoobarbuzz"
        temp_dir = self._CreateDeepS3Structure(ckpt_content=ckpt_content)
        ckpt_path = self._PathJoin(temp_dir, "model.ckpt")
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

    @mock_s3
    def testWrite(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    @mock_s3
    def testOverwrite(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "w") as f:
            f.write("original")
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    @mock_s3
    def testWriteMultiple(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = "asdfasdfasdffoobarbuzz" * 5
        with gfile.GFile(ckpt_path, "w") as f:
            for i in range(0, len(ckpt_content), 3):
                f.write(ckpt_content[i : i + 3])
                # Test periodic flushing of the file
                if i % 9 == 0:
                    f.flush()
        with gfile.GFile(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    @mock_s3
    def testWriteEmpty(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = ""
        with gfile.GFile(ckpt_path, "w") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "r") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    @mock_s3
    def testWriteBinary(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = os.path.join(temp_dir, "model.ckpt")
        ckpt_content = b"asdfasdfasdffoobarbuzz"
        with gfile.GFile(ckpt_path, "wb") as f:
            f.write(ckpt_content)
        with gfile.GFile(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    @mock_s3
    def testWriteMultipleBinary(self):
        temp_dir = self._CreateDeepS3Structure()
        ckpt_path = os.path.join(temp_dir, "model2.ckpt")
        ckpt_content = b"asdfasdfasdffoobarbuzz" * 5
        with gfile.GFile(ckpt_path, "wb") as f:
            for i in range(0, len(ckpt_content), 3):
                f.write(ckpt_content[i : i + 3])
                # Test periodic flushing of the file
                if i % 9 == 0:
                    f.flush()
        with gfile.GFile(ckpt_path, "rb") as f:
            ckpt_read = f.read()
            self.assertEqual(ckpt_content, ckpt_read)

    def _PathJoin(self, *args):
        """Join directory and path with slash and not local separator."""
        return "/".join(args)

    def _CreateDeepS3Structure(
        self,
        top_directory="top_dir",
        ckpt_content="",
        region_name="us-east-1",
        bucket_name="test",
    ):
        """Creates a reasonable deep structure of S3 subdirectories with files.

        Args:
          top_directory: The path of the top level S3 directory in which
            to create the directory structure. Defaults to 'top_dir'.
          ckpt_content: The content to put into model.ckpt. Default to ''.
          region_name: The S3 region name. Defaults to 'us-east-1'.
          bucket_name: The S3 bucket name. Defaults to 'test'.

        Returns:
          S3 URL of the top directory in the form 's3://bucket/path'
        """
        s3_top_url = "s3://{}/{}".format(bucket_name, top_directory)

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
        client = boto3.client("s3", region_name=region_name)
        client.create_bucket(Bucket=bucket_name)
        client.put_object(Body="", Bucket=bucket_name, Key=top_directory)
        for directory_name in directory_names:
            # Add an end slash
            path = top_directory + "/" + directory_name + "/"
            # Create an empty object so the location exists
            client.put_object(Body="", Bucket=bucket_name, Key=directory_name)

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
            # Add an end slash
            path = top_directory + "/" + file_name
            if file_name == "model.ckpt":
                content = ckpt_content
            else:
                content = ""
            client.put_object(Body=content, Bucket=bucket_name, Key=path)
        return s3_top_url

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
    unittest.main()
