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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import tempfile

import six
import tensorflow as tf

from tensorboard.backend.event_processing import io_wrapper


class IoWrapperTest(tf.test.TestCase):
  def testIsGcsPathIsTrue(self):
    self.assertTrue(io_wrapper.IsGCSPath('gs://bucket/foo'))

  def testIsGcsPathIsFalse(self):
    self.assertFalse(io_wrapper.IsGCSPath('/tmp/foo'))

  def testIsCnsPathTrue(self):
    self.assertTrue(io_wrapper.IsCnsPath('/cns/foo/bar'))

  def testIsCnsPathFalse(self):
    self.assertFalse(io_wrapper.IsCnsPath('/tmp/foo'))

  def testIsIsTensorFlowEventsFileTrue(self):
    self.assertTrue(
        io_wrapper.IsTensorFlowEventsFile(
            '/logdir/events.out.tfevents.1473720042.com'))

  def testIsIsTensorFlowEventsFileFalse(self):
    self.assertFalse(
        io_wrapper.IsTensorFlowEventsFile('/logdir/model.ckpt'))

  def testIsIsTensorFlowEventsFileWithEmptyInput(self):
    with six.assertRaisesRegex(self,
                               ValueError,
                               r'Path must be a nonempty string'):
      io_wrapper.IsTensorFlowEventsFile('')

  def testListDirectoryAbsolute(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())

    # Add a few subdirectories.
    directory_names = (
        'foo',
        'bar',
        'we/must/go/deeper'
    )
    for directory_name in directory_names:
      os.makedirs(os.path.join(temp_dir, directory_name))

    # Add a few files to the directory.
    file_names = (
        'events.out.tfevents.1473720381.foo.com',
        'model.ckpt',
        'we/must_not_include_this_file_in_the_listing.txt'
    )
    for file_name in file_names:
      open(os.path.join(temp_dir, file_name), 'w').close()

    expected_files = (
        'foo',
        'bar',
        'we',
        'events.out.tfevents.1473720381.foo.com',
        'model.ckpt',
    )
    self.assertItemsEqual(
        (os.path.join(temp_dir, f) for f in expected_files),
        io_wrapper.ListDirectoryAbsolute(temp_dir))

  def testGlobAndListFiles(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self._CreateDeepDirectoryStructure(temp_dir)
    expected = (
        'foo',
        'bar',
        'bar/events.out.tfevents.1473720382.bar.com',
        'bar/red_herring.txt',
        'bar/baz',
        'bar/baz/events.out.tfevents.1473720383.baz.com',
        'bar/baz/events.out.tfevents.1473720384.baz.com',
        'events.out.tfevents.1473720381.meep.com',
        'model.ckpt',
    )
    self.assertItemsEqual(
        [os.path.join(temp_dir, f) for f in expected] + [temp_dir],
        list(io_wrapper.GlobAndListFiles(temp_dir)))

  def testWalkAndListFilesPerDirectoryForNestedFiles(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self._CreateDeepDirectoryStructure(temp_dir)

    # There were 4 subdirectories in total.
    listing = io_wrapper.WalkAndListFilesPerDirectory(temp_dir)
    directory_to_listing = {
        dir: list(generator) for (dir, generator) in listing}
    expected = (
        'foo',
        'bar',
        'bar/baz'
    )
    self.assertItemsEqual(
        [os.path.join(temp_dir, f) for f in expected] + [temp_dir],
        directory_to_listing.keys())

    # Test for the listings of individual directories.
    expected = (
        'events.out.tfevents.1473720381.meep.com',
        'model.ckpt',
    )
    self.assertItemsEqual(
        (os.path.join(temp_dir, f) for f in expected),
        directory_to_listing[temp_dir])

    expected = ()
    self.assertItemsEqual(
        (os.path.join(temp_dir, 'foo', f) for f in expected),
        directory_to_listing[os.path.join(temp_dir, 'foo')])

    expected = (
        'events.out.tfevents.1473720382.bar.com',
        'red_herring.txt',
    )
    self.assertItemsEqual(
        (os.path.join(temp_dir, 'bar', f) for f in expected),
        directory_to_listing[os.path.join(temp_dir, 'bar')])

    expected = (
        'events.out.tfevents.1473720383.baz.com',
        'events.out.tfevents.1473720384.baz.com',
    )
    self.assertItemsEqual(
        (os.path.join(temp_dir, 'bar/baz', f) for f in expected),
        directory_to_listing[os.path.join(temp_dir, 'bar/baz')])

  def testWalkAndListFilesPerDirectoryForEmptyDirectory(self):
    empty_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    subdirectory_entries = list(
        io_wrapper.WalkAndListFilesPerDirectory(empty_dir))
    self.assertEqual(1, len(subdirectory_entries))

    entry = subdirectory_entries[0]
    self.assertEqual(empty_dir, entry[0])
    self.assertItemsEqual((), entry[1])

  def _CreateDeepDirectoryStructure(self, top_directory):
    """Creates a reasonable deep structure of subdirectories with files.

    Args:
      top_directory: The absolute path of the top level directory in
        which to create the directory structure.
    """
    # Add a few subdirectories.
    directory_names = (
        'foo',
        'bar',
        'bar/baz',
    )
    for directory_name in directory_names:
      os.makedirs(os.path.join(top_directory, directory_name))

    # Add a few files to the directory.
    file_names = (
        'events.out.tfevents.1473720381.meep.com',
        'model.ckpt',
        'bar/events.out.tfevents.1473720382.bar.com',
        'bar/red_herring.txt',
        'bar/baz/events.out.tfevents.1473720383.baz.com',
        'bar/baz/events.out.tfevents.1473720384.baz.com',
    )
    for file_name in file_names:
      open(os.path.join(top_directory, file_name), 'w').close()


if __name__ == '__main__':
  tf.test.main()
