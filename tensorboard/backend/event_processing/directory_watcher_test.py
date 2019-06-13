# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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

"""Tests for directory_watcher."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import shutil

import tensorflow as tf

from tensorboard.backend.event_processing import directory_watcher
from tensorboard.backend.event_processing import io_wrapper


class _TimedByte(object):

  def __init__(self, byte, step, wall_time):
    self.byte = byte
    self.step = step
    self.wall_time = wall_time


class _ByteLoader(object):
  """A loader that loads individual byte, step, and wall_time from a file.

  Expects a csv separated [byte,number,number].
  """

  def __init__(self, path):
    self._f = open(path)
    self.bytes_read = 0

  def Load(self):
    while True:
      self._f.seek(self.bytes_read)
      line = next(self._f, None)
      if line:
        print(line)
        print(len(line))
        self.bytes_read += len(line)
        byte, step, wall_time = line.split(',')
        step = int(step)
        wall_time = int(wall_time)
        yield _TimedByte(byte, step, wall_time)
      else:
        return


class DirectoryWatcherTest(tf.test.TestCase):

  def setUp(self):
    # Put everything in a directory so it's easier to delete.
    self._directory = os.path.join(self.get_temp_dir(), 'monitor_dir')
    os.mkdir(self._directory)
    self._watcher = directory_watcher.DirectoryWatcher(self._directory,
                                                       _ByteLoader)
    self.stubs = tf.compat.v1.test.StubOutForTesting()

  def tearDown(self):
    self.stubs.CleanUp()
    try:
      shutil.rmtree(self._directory)
    except OSError:
      # Some tests delete the directory.
      pass

  def _WriteToFile(self, filename, data):
    path = os.path.join(self._directory, filename)
    with open(path, 'a') as f:
      f.write(data)

  def _LoadAllEvents(self):
    """Loads all events in the watcher."""
    for _ in self._watcher.Load():
      pass

  def assertWatcherYields(self, values):
    read_bytes = []
    for timed_byte in self._watcher.Load():
      read_bytes.append(timed_byte.byte)
    self.assertEqual(read_bytes, values)

  def testRaisesWithBadArguments(self):
    with self.assertRaises(ValueError):
      directory_watcher.DirectoryWatcher(None, lambda x: None)
    with self.assertRaises(ValueError):
      directory_watcher.DirectoryWatcher('dir', None)

  def testEmptyDirectory(self):
    self.assertWatcherYields([])

  def testSingleWrite(self):
    self._WriteToFile('a', 'a,1,1\nb,2,2\nc,3,3\n')
    self.assertWatcherYields(['a', 'b', 'c'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testMultipleWrites(self):
    self._WriteToFile('a', 'a,1,1\nb,2,2\nc,3,3\n')
    self.assertWatcherYields(['a', 'b', 'c'])
    self._WriteToFile('a', 'x,4,4\ny,5,5\nz,6,6\n')
    self.assertWatcherYields(['x', 'y', 'z'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testMultipleLoads(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._watcher.Load()
    self._watcher.Load()
    self.assertWatcherYields(['a'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testMultipleFilesAtOnce(self):
    self._WriteToFile('b', 'b,2,2\n')
    self._WriteToFile('a', 'a,1,1\n')
    self.assertWatcherYields(['a', 'b'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testFinishesLoadingFileWhenSwitchingToNewFile(self):
    self._WriteToFile('a', 'a,1,1\n')
    # Empty the iterator.
    self.assertEqual(['a'], list(next(self._watcher.Load()).byte))
    self._WriteToFile('a', 'b,2,2\n')
    self._WriteToFile('b', 'c,3,3\n')
    # The watcher should finish its current file before starting a new one.
    self.assertWatcherYields(['b', 'c'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testIntermediateEmptyFiles(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._WriteToFile('b', '')
    self._WriteToFile('c', 'c,2,2\n')
    self.assertWatcherYields(['a', 'c'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testPathFilter(self):
    self._watcher = directory_watcher.DirectoryWatcher(
        self._directory, _ByteLoader,
        lambda path: 'do_not_watch_me' not in path)

    self._WriteToFile('a', 'a,1,1\n')
    self._WriteToFile('do_not_watch_me', 'b,2,2\n')
    self._WriteToFile('c', 'c,3,3\n')
    self.assertWatcherYields(['a', 'c'])
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testDetectsNewOldFiles(self):
    self._WriteToFile('b', 'a,2,2\n')
    self._LoadAllEvents()
    self._WriteToFile('a', 'a,1,1\n')
    self._LoadAllEvents()
    self.assertTrue(self._watcher.OutOfOrderWritesDetected())

  def testIgnoresNewerFiles(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._LoadAllEvents()
    self._WriteToFile('q', 'a,2,2\n')
    self._LoadAllEvents()
    self.assertFalse(self._watcher.OutOfOrderWritesDetected())

  def testDetectsChangingOldFiles(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._WriteToFile('b', 'a,3,3\n')
    self._LoadAllEvents()
    self._WriteToFile('a', 'c,2,2\n')
    self._LoadAllEvents()
    self.assertTrue(self._watcher.OutOfOrderWritesDetected())

  def testDoesntCrashWhenFileIsDeleted(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._LoadAllEvents()
    os.remove(os.path.join(self._directory, 'a'))
    self._WriteToFile('b', 'b,2,2\n')
    self.assertWatcherYields(['b'])

  def testRaisesRightErrorWhenDirectoryIsDeleted(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._LoadAllEvents()
    shutil.rmtree(self._directory)
    with self.assertRaises(directory_watcher.DirectoryDeletedError):
      self._LoadAllEvents()

  def testDoesntRaiseDirectoryDeletedErrorIfOutageIsTransient(self):
    self._WriteToFile('a', 'a,1,1\n')
    self._LoadAllEvents()
    shutil.rmtree(self._directory)

    # Fake a single transient I/O error.
    def FakeFactory(original):

      def Fake(*args, **kwargs):
        if FakeFactory.has_been_called:
          original(*args, **kwargs)
        else:
          raise OSError('lp0 temporarily on fire')

      return Fake

    FakeFactory.has_been_called = False

    stub_names = [
        'ListDirectoryAbsolute',
        'ListRecursivelyViaGlobbing',
        'ListRecursivelyViaWalking',
    ]
    for stub_name in stub_names:
      self.stubs.Set(io_wrapper, stub_name,
                     FakeFactory(getattr(io_wrapper, stub_name)))
    for stub_name in ['exists', 'stat']:
      self.stubs.Set(tf.io.gfile, stub_name,
                     FakeFactory(getattr(tf.io.gfile, stub_name)))

    with self.assertRaises((IOError, OSError)):
      self._LoadAllEvents()


if __name__ == '__main__':
  tf.test.main()
