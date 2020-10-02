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
"""IO helper functions."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
import collections
import os
import re
import queue
import time
import threading
import six

from tensorboard.compat import tf
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()

_ESCAPE_GLOB_CHARACTERS_REGEX = re.compile("([*?[])")

directory_cache = {}
use_bfs_and_build_cache_MT = True
concurrent_dir_discover_cache_TTL = 30


def IsCloudPath(path):
    return (
        path.startswith("gs://")
        or path.startswith("s3://")
        or path.startswith("/cns/")
    )


def PathSeparator(path):
    return "/" if IsCloudPath(path) else os.sep


def IsTensorFlowEventsFile(path):
    """Check the path name to see if it is probably a TF Events file.

    Args:
      path: A file path to check if it is an event file.

    Raises:
      ValueError: If the path is an empty string.

    Returns:
      If path is formatted like a TensorFlowEventsFile. Dummy files such as
        those created with the '.profile-empty' suffixes and meant to hold
        no `Summary` protos are treated as true TensorFlowEventsFiles. For
        background, see: https://github.com/tensorflow/tensorboard/issues/2084.
    """
    if not path:
        raise ValueError("Path must be a nonempty string")
    return "tfevents" in tf.compat.as_str_any(os.path.basename(path))


def IsSummaryEventsFile(path):
    """Check whether the path is probably a TF Events file containing Summary.

    Args:
      path: A file path to check if it is an event file containing `Summary`
        protos.

    Returns:
      If path is formatted like a TensorFlowEventsFile. Dummy files such as
        those created with the '.profile-empty' suffixes and meant to hold
        no `Summary` protos  are treated as `False`. For background, see:
        https://github.com/tensorflow/tensorboard/issues/2084.
    """
    return IsTensorFlowEventsFile(path) and not path.endswith(".profile-empty")


def ListDirectoryAbsolute(directory):
    """Yields all files in the given directory.

    The paths are absolute.
    """
    if len(directory_cache) > 0:
        return directory_cache[directory]
    else:
        return (
            os.path.join(directory, path)
            for path in tf.io.gfile.listdir(directory)
        )


def _EscapeGlobCharacters(path):
    """Escapes the glob characters in a path.

    Python 3 has a glob.escape method, but python 2 lacks it, so we manually
    implement this method.

    Args:
      path: The absolute path to escape.

    Returns:
      The escaped path string.
    """
    drive, path = os.path.splitdrive(path)
    return "%s%s" % (drive, _ESCAPE_GLOB_CHARACTERS_REGEX.sub(r"[\1]", path))


def ListRecursivelyViaGlobbing(top):
    """Recursively lists all files within the directory.

    This method does not list subdirectories (in addition to regular files), and
    the file paths are all absolute. If the directory does not exist, this yields
    nothing.

    This method does so by glob-ing deeper and deeper directories, ie
    foo/*, foo/*/*, foo/*/*/* and so on until all files are listed. All file
    paths are absolute, and this method lists subdirectories too.

    For certain file systems, globbing via this method may prove significantly
    faster than recursively walking a directory. Specifically, TF file systems
    that implement TensorFlow's FileSystem.GetMatchingPaths method could save
    costly disk reads by using this method. However, for other file systems, this
    method might prove slower because the file system performs a walk per call to
    glob (in which case it might as well just perform 1 walk).

    Args:
      top: A path to a directory.

    Yields:
      A (dir_path, file_paths) tuple for each directory/subdirectory.
    """
    current_glob_string = os.path.join(_EscapeGlobCharacters(top), "*")
    level = 0

    while True:
        logger.info("GlobAndListFiles: Starting to glob level %d", level)
        glob = tf.io.gfile.glob(current_glob_string)
        logger.info(
            "GlobAndListFiles: %d files glob-ed at level %d", len(glob), level
        )

        if not glob:
            # This subdirectory level lacks files. Terminate.
            return

        # Map subdirectory to a list of files.
        pairs = collections.defaultdict(list)
        for file_path in glob:
            pairs[os.path.dirname(file_path)].append(file_path)
        for dir_name, file_paths in six.iteritems(pairs):
            yield (dir_name, tuple(file_paths))

        if len(pairs) == 1:
            # If at any point the glob returns files that are all in a single
            # directory, replace the current globbing path with that directory as the
            # literal prefix. This should improve efficiency in cases where a single
            # subdir is significantly deeper than the rest of the sudirs.
            current_glob_string = os.path.join(list(pairs.keys())[0], "*")

        # Iterate to the next level of subdirectories.
        current_glob_string = os.path.join(current_glob_string, "*")
        level += 1


class ListRecursivelyViaBFSWalking:
    """A class that walks a directory recursively with multiple threads.

    For network based file systems, listing the directory might suffer from large latency. 
    This class walks the directory with breadth first strategy with concurrent threads to speed up.
    The result is put inside walked_structure.
    Also, this class maintains a cache to speed up the query. If the cache is not expired, the class has no side effect.
    Since I want to keep the function signature intact, some parameters are passed by global vars.
    Args:
      top_directory: A path to a directory.

    Returns:
      Nothing. The result is stored in return_structure.
    """

    class _BFSWALK:
        def __init__(
            self,
            baseDir,
            list_dir_function=None,
            num_threads=20,
            max_delay_multiplier=5,
        ):
            self.return_structure = []
            self.list_dir_function = list_dir_function
            start = time.time()
            list_dir_function(".")  # better change this to a network path
            self.max_idle_time_in_sec = (
                time.time() - start
            ) * max_delay_multiplier
            self.unwalked_dirs = queue.Queue()
            self.unwalked_dirs.put(baseDir)
            self.threads = []
            for i in range(num_threads):
                t = threading.Thread(name="thread" + str(i), target=self.worker)
                self.threads.append(t)
                t.start()

            for t in self.threads:
                t.join()

        def worker(self):
            """thread worker function"""
            if "last_job_time" not in locals():
                last_job_time = time.time()
            while True:
                try:
                    current = self.unwalked_dirs.get(False)
                    last_job_time = time.time()
                except queue.Empty:
                    # Don't kill a thread too early, or we will lack of workers if the network is too slow.
                    # max_idle_time_in_sec is determined based on a call to list_dir_function
                    if time.time() - last_job_time > self.max_idle_time_in_sec:
                        break
                    time.sleep(0.1)
                    continue

                children = self.list_dir_function(current)
                file_paths = []
                dir_paths = []
                for c in children:
                    fullpath = os.path.join(current, c)
                    # check symbolic link?
                    if os.path.isdir(fullpath):
                        self.unwalked_dirs.put(fullpath)
                        dir_paths.append(fullpath)
                    else:
                        file_paths.append(fullpath)
                self.return_structure.append(
                    (current, tuple(dir_paths), tuple(file_paths))
                )

    instance = None
    walked_structure = None
    last_update_time = 0

    def __init__(
        self,
        top_directory,
        list_dir_function=None,
        concurrent_dir_discover_cache_TTL=30,
    ):
        if (
            not ListRecursivelyViaBFSWalking.instance
            or time.time() - ListRecursivelyViaBFSWalking.last_update_time
            > concurrent_dir_discover_cache_TTL
        ):
            ListRecursivelyViaBFSWalking.instance = ListRecursivelyViaBFSWalking._BFSWALK(
                top_directory, list_dir_function
            )
            ListRecursivelyViaBFSWalking.walked_structure = (
                ListRecursivelyViaBFSWalking.instance.return_structure
            )
            ListRecursivelyViaBFSWalking.last_update_time = time.time()
        else:
            logger.info("Reuse the cache for ListRecursivelyViaBFSWalking")


def ListRecursivelyViaWalking(top):
    """Walks a directory tree, yielding (dir_path, file_paths) tuples.

    For each of `top` and its subdirectories, yields a tuple containing the path
    to the directory and the path to each of the contained files.  Note that
    unlike os.Walk()/tf.io.gfile.walk()/ListRecursivelyViaGlobbing, this does not
    list subdirectories. The file paths are all absolute. If the directory does
    not exist, this yields nothing.

    Walking may be incredibly slow on certain file systems.

    Args:
      top: A path to a directory.

    Yields:
      A (dir_path, file_paths) tuple for each directory/subdirectory.
    """
    if use_bfs_and_build_cache_MT:
        walked = ListRecursivelyViaBFSWalking(
            top,
            list_dir_function=tf.io.gfile.listdir,
            concurrent_dir_discover_cache_TTL=concurrent_dir_discover_cache_TTL,
        ).walked_structure
        global directory_cache
        directory_cache = {}

        for key, dirs, files in walked:
            directory_cache[key] = dirs + files
        for dir_path, _, filename in walked:
            yield (dir_path, filename)
    else:
        for dir_path, _, filenames in tf.io.gfile.walk(top, topdown=True):
            yield (
                dir_path,
                (os.path.join(dir_path, filename) for filename in filenames),
            )


def GetLogdirSubdirectories(path, concurrent_dir_discover=False, cache_TTL=30):
    """Obtains all subdirectories with events files.

    The order of the subdirectories returned is unspecified. The internal logic
    that determines order varies by scenario.

    Args:
      path: The path to a directory under which to find subdirectories.

    Returns:
      A tuple of absolute paths of all subdirectories each with at least 1 events
      file directly within the subdirectory.

    Raises:
      ValueError: If the path passed to the method exists and is not a directory.
    """
    if not tf.io.gfile.exists(path):
        # No directory to traverse.
        return ()

    if not tf.io.gfile.isdir(path):
        raise ValueError(
            "GetLogdirSubdirectories: path exists and is not a "
            "directory, %s" % path
        )

    if IsCloudPath(path):
        # Glob-ing for files can be significantly faster than recursively
        # walking through directories for some file systems.
        logger.info(
            "GetLogdirSubdirectories: Starting to list directories via glob-ing."
        )
        traversal_method = ListRecursivelyViaGlobbing
    else:
        # For other file systems, the glob-ing based method might be slower because
        # each call to glob could involve performing a recursive walk.
        logger.info(
            "GetLogdirSubdirectories: Starting to list directories via walking."
        )
        if not concurrent_dir_discover:
            global use_bfs_and_build_cache_MT
            use_bfs_and_build_cache_MT = False
        else:
            global concurrent_dir_discover_cache_TTL
            concurrent_dir_discover_cache_TTL = cache_TTL
        traversal_method = ListRecursivelyViaWalking

    return (
        subdir
        for (subdir, files) in traversal_method(path)
        if any(IsTensorFlowEventsFile(f) for f in files)
    )
