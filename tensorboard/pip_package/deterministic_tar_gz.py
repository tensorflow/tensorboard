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

Some differences from `tar czf ARCHIVE [FILES]...`:

  - Timestamps (modification time, access time) are omitted.
  - Owners and groups are omitted.
  - Archive entries are not prefixed with the directory name or path.
  - Dirnames are stripped.

See <https://reproducible-builds.org/docs/archives/>.
"""


import argparse
import gzip
import os
import sys
import tarfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "archive",
        metavar="ARCHIVE",
        help="name for the output `.tar.gz` archive",
    )
    parser.add_argument(
        "files",
        metavar="files",
        nargs="*",
        help="files to include in the archive; basenames must be distinct",
    )
    args = parser.parse_args()
    archive = args.archive
    files = args.files
    del args

    if len(frozenset(os.path.basename(f) for f in files)) != len(files):
        sys.stderr.write("Input basenames must be distinct; got: %r\n" % files)
        sys.exit(1)

    # (`fd` will be closed by `fdopen` context manager below)
    fd = os.open(archive, os.O_WRONLY | os.O_CREAT, 0o644)
    with os.fdopen(fd, "wb") as out_file, gzip.GzipFile(
        "wb", fileobj=out_file, mtime=0
    ) as gzip_file, tarfile.open(fileobj=gzip_file, mode="w:") as tar_file:
        for f in files:
            arcname = os.path.basename(f)
            tar_file.add(f, filter=cleanse, recursive=False, arcname=arcname)


def cleanse(tarinfo):
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


if __name__ == "__main__":
    main()
