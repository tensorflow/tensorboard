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
#
# Much of this module is forked from Servo's `command_base.py`,
# originally written by Anton Ovchinnikov and also provided under the
# Apache-2.0 License:
#
# https://github.com/servo/servo/blob/d9fdf42bfe53dab08ba38fcdb349e84355f4cb3e/python/servo/command_base.py
# https://github.com/servo/servo/pull/12244
#
"""Generate `.tar.gz` archives deterministically.

See <https://reproducible-builds.org/docs/archives/>.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import contextlib
import functools
import gzip
import itertools
import locale
import os
import shutil
import tarfile
import tempfile


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument(
      "archive",
      metavar="ARCHIVE",
      help="name for the output file; should probably end in '.tar.gz'",
  )
  parser.add_argument(
      "directory",
      metavar="DIRECTORY",
      help="path to directory to be archived",
  )
  args = parser.parse_args()
  archive_deterministically(archive=args.archive, directory=args.directory)


def archive_deterministically(archive, directory):
  """Create a `.tar.gz` archive in a deterministic, reproducible manner.

  Some differences from `tar czf ARCHIVE DIRECTORY`:

    - Timestamps (modification time, access time) are omitted.
    - Owners and groups are omitted.
    - Archive entries are not prefixed with the directory name or path.

  Args:
    archive: Path to output file to be created.
    directory: Path to directory to be recursively archived.
  """
  def reset(tarinfo):
    """Cleanse sources of nondeterminism from tar entries.

    To be passed as the `filter` kwarg to `tarfile.TarFile.add`.

    Args:
      tarinfo: A `tarfile.TarInfo` object to be mutated.

    Returns:
      The same `tarinfo` object, but mutated.
    """
    tarinfo.uid = 0
    tarinfo.gid = 0
    tarinfo.uname = "root"
    tarinfo.gname = "root"
    tarinfo.mtime = 0
    return tarinfo

  archive = os.path.abspath(archive)
  with cd(directory):  # otherwise we need to strip path prefixes
    file_list = []
    for (root, dirs, files) in os.walk("."):
      for name in itertools.chain(dirs, files):
        file_list.append(os.path.join(root, name))

    # Sort file entries with a fixed locale.
    with setlocale("C"):
      file_list.sort(key=functools.cmp_to_key(locale.strcoll))

    # Use a temporary file and atomic rename to avoid partially-formed
    # packaging (in case of exceptional situations like running out of
    # disk space).
    with mkdtemp() as temp_directory:
      temp_archive = os.path.join(temp_directory, ".result.tar.gz")
      # (`fd` will be closed by `fdopen` context manager below)
      fd = os.open(temp_archive, os.O_WRONLY | os.O_CREAT, 0o644)
      with \
          os.fdopen(fd, "wb") as out_file, \
          gzip.GzipFile("wb", fileobj=out_file, mtime=0) as gzip_file, \
          tarfile.open(fileobj=gzip_file, mode="w:") as tar_file:
        for entry in file_list:
          arcname = os.path.normpath(entry)
          tar_file.add(entry, filter=reset, recursive=False, arcname=arcname)
      shutil.move(temp_archive, archive)


@contextlib.contextmanager
def cd(new_path):
  """Context manager for changing the current working directory."""
  previous_path = os.getcwd()
  try:
    os.chdir(new_path)
    yield
  finally:
    os.chdir(previous_path)


@contextlib.contextmanager
def setlocale(name):
  """Context manager for changing the current locale."""
  saved_locale = locale.setlocale(locale.LC_ALL)
  try:
    yield locale.setlocale(locale.LC_ALL, name)
  finally:
    locale.setlocale(locale.LC_ALL, saved_locale)


@contextlib.contextmanager
def mkdtemp():
  tmpdir = tempfile.mkdtemp()
  try:
    yield tmpdir
  finally:
    shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
  main()
