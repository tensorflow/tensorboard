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
    self._CreateDeepDirectoryStructure(temp_dir)

    expected_files = (
        'foo',
        'bar',
        'quuz',
        'a.tfevents.1',
        'model.ckpt',
        'waldo',
    )
    self.assertItemsEqual(
        (os.path.join(temp_dir, f) for f in expected_files),
        io_wrapper.ListDirectoryAbsolute(temp_dir))

  def testListRecursivelyViaGlobbing(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self._CreateDeepDirectoryStructure(temp_dir)
    expected = [
        ['', [
            'foo',
            'bar',
            'a.tfevents.1',
            'model.ckpt',
            'quuz',
            'waldo',
        ]],
        ['bar', [
            'b.tfevents.1',
            'red_herring.txt',
            'baz',
            'quux',
        ]],
        ['bar/baz', [
            'c.tfevents.1',
            'd.tfevents.1',
        ]],
        ['bar/quux', [
            'some_flume_output.txt',
            'some_more_flume_output.txt',
        ]],
        ['quuz', [
            'e.tfevents.1',
            'garply',
        ]],
        ['quuz/garply', [
            'f.tfevents.1',
            'corge',
            'grault',
        ]],
        ['quuz/garply/corge', [
            'g.tfevents.1'
        ]],
        ['quuz/garply/grault', [
            'h.tfevents.1',
        ]],
        ['waldo', [
            'fred',
        ]],
        ['waldo/fred', [
            'i.tfevents.1',
        ]],
    ]
    for pair in expected:
      # If this is not the top-level directory, prepend the high-level
      # directory.
      pair[0] = os.path.join(temp_dir, pair[0]) if pair[0] else temp_dir
      pair[1] = [os.path.join(pair[0], f) for f in pair[1]]
    self._CompareFilesPerSubdirectory(
        expected, io_wrapper.ListRecursivelyViaGlobbing(temp_dir))

  def testListRecursivelyViaGlobbingForPathWithGlobCharacters(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    directory_names = (
        'ba*',
        'ba*/subdirectory',
        'bar',
    )
    for directory_name in directory_names:
      os.makedirs(os.path.join(temp_dir, directory_name))

    file_names = (
        'ba*/a.tfevents.1',
        'ba*/subdirectory/b.tfevents.1',
        'bar/c.tfevents.1',
    )
    for file_name in file_names:
      open(os.path.join(temp_dir, file_name), 'w').close()

    expected = [
        ['', [
            'a.tfevents.1',
            'subdirectory',
        ]],
        ['subdirectory', [
            'b.tfevents.1',
        ]],
        # The contents of the bar subdirectory should be excluded from
        # this listing because the * character should have been escaped.
    ]
    top = os.path.join(temp_dir, 'ba*')
    for pair in expected:
      # If this is not the top-level directory, prepend the high-level
      # directory.
      pair[0] = os.path.join(top, pair[0]) if pair[0] else top
      pair[1] = [os.path.join(pair[0], f) for f in pair[1]]
    self._CompareFilesPerSubdirectory(
        expected, io_wrapper.ListRecursivelyViaGlobbing(top))

  def testListRecursivelyViaWalking(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self._CreateDeepDirectoryStructure(temp_dir)
    expected = [
        ['', [
            'a.tfevents.1',
            'model.ckpt',
        ]],
        ['foo', []],
        ['bar', [
            'b.tfevents.1',
            'red_herring.txt',
        ]],
        ['bar/baz', [
            'c.tfevents.1',
            'd.tfevents.1',
        ]],
        ['bar/quux', [
            'some_flume_output.txt',
            'some_more_flume_output.txt',
        ]],
        ['quuz', [
            'e.tfevents.1',
        ]],
        ['quuz/garply', [
            'f.tfevents.1',
        ]],
        ['quuz/garply/corge', [
            'g.tfevents.1',
        ]],
        ['quuz/garply/grault', [
            'h.tfevents.1',
        ]],
        ['waldo', []],
        ['waldo/fred', [
            'i.tfevents.1',
        ]],
    ]
    for pair in expected:
      # If this is not the top-level directory, prepend the high-level
      # directory.
      pair[0] = os.path.join(temp_dir, pair[0]) if pair[0] else temp_dir
      pair[1] = [os.path.join(pair[0], f) for f in pair[1]]
    self._CompareFilesPerSubdirectory(
        expected, io_wrapper.ListRecursivelyViaWalking(temp_dir))

  def testGetLogdirSubdirectories(self):
    temp_dir = tempfile.mkdtemp(prefix=self.get_temp_dir())
    self._CreateDeepDirectoryStructure(temp_dir)
    # Only subdirectories that immediately contains at least 1 events
    # file should be listed.
    expected = [
        '',
        'bar',
        'bar/baz',
        'quuz',
        'quuz/garply',
        'quuz/garply/corge',
        'quuz/garply/grault',
        'waldo/fred',
    ]
    self.assertItemsEqual(
        [(os.path.join(temp_dir, subdir) if subdir else temp_dir)
         for subdir in expected],
        io_wrapper.GetLogdirSubdirectories(temp_dir))

  def _CreateDeepDirectoryStructure(self, top_directory):
    """Creates a reasonable deep structure of subdirectories with files.

    Args:
      top_directory: The absolute path of the top level directory in
        which to create the directory structure.
    """
    # Add a few subdirectories.
    directory_names = (
        # An empty directory.
        'foo',
        # A directory with an events file (and a text file).
        'bar',
        # A deeper directory with events files.
        'bar/baz',
        # A non-empty subdirectory that lacks event files (should be ignored).
        'bar/quux',
        # This 3-level deep set of subdirectories tests logic that replaces the
        # full glob string with an absolute path prefix if there is only 1
        # subdirectory in the final mapping.
        'quuz/garply',
        'quuz/garply/corge',
        'quuz/garply/grault',
        # A directory that lacks events files, but contains a subdirectory
        # with events files (first level should be ignored, second level should
        # be included).
        'waldo',
        'waldo/fred',
    )
    for directory_name in directory_names:
      os.makedirs(os.path.join(top_directory, directory_name))

    # Add a few files to the directory.
    file_names = (
        'a.tfevents.1',
        'model.ckpt',
        'bar/b.tfevents.1',
        'bar/red_herring.txt',
        'bar/baz/c.tfevents.1',
        'bar/baz/d.tfevents.1',
        'bar/quux/some_flume_output.txt',
        'bar/quux/some_more_flume_output.txt',
        'quuz/e.tfevents.1',
        'quuz/garply/f.tfevents.1',
        'quuz/garply/corge/g.tfevents.1',
        'quuz/garply/grault/h.tfevents.1',
        'waldo/fred/i.tfevents.1',
    )
    for file_name in file_names:
      open(os.path.join(top_directory, file_name), 'w').close()

  def _CompareFilesPerSubdirectory(self, expected, gotten):
    """Compares iterables of (subdirectory path, list of absolute paths)

    Args:
      expected: The expected iterable of 2-tuples.
      gotten: The gotten iterable of 2-tuples.
    """
    expected_directory_to_listing = {
        result[0]: list(result[1]) for result in expected}
    gotten_directory_to_listing = {
        result[0]: list(result[1]) for result in gotten}
    self.assertItemsEqual(
        expected_directory_to_listing.keys(),
        gotten_directory_to_listing.keys())

    for subdirectory, expected_listing in expected_directory_to_listing.items():
      gotten_listing = gotten_directory_to_listing[subdirectory]
      self.assertItemsEqual(
          expected_listing,
          gotten_listing,
          'Files for subdirectory %r must match. Expected %r. Got %r.' % (
              subdirectory, expected_listing, gotten_listing))



if __name__ == '__main__':
  tf.test.main()
