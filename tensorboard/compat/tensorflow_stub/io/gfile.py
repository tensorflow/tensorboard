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
"""File IO methods that wrap the C++ FileSystem API.

The C++ FileSystem API is SWIG wrapped in file_io.i. These functions call those
to accomplish basic File IO operations.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from collections import namedtuple
import binascii
import collections
import glob as py_glob
import io
import os
import shutil
import six
import uuid
try:
    import botocore.exceptions
    import boto3
    S3_ENABLED = True
except ImportError:
    S3_ENABLED = False

from tensorboard.compat.tensorflow_stub import compat, errors


# A good default block size depends on the system in question.
# A somewhat conservative default chosen here.
_DEFAULT_BLOCK_SIZE = 16 * 1024 * 1024


# Registry of filesystems by prefix.
#
# Currently supports "s3://" URLs for S3 based on boto3 and falls
# back to local filesystem.
_REGISTERED_FILESYSTEMS = {}


def register_filesystem(prefix, filesystem):
    if ':' in prefix:
        raise ValueError("Filesystem prefix cannot contain a :")
    _REGISTERED_FILESYSTEMS[prefix] = filesystem


def get_filesystem(filename):
    """Return the registered filesystem for the given file."""
    filename = compat.as_str_any(filename)
    prefix = ""
    index = filename.find("://")
    if index >= 0:
        prefix = filename[:index]
    fs = _REGISTERED_FILESYSTEMS.get(prefix, None)
    if fs is None:
        raise ValueError("No recognized filesystem for prefix %s" % prefix)
    return fs


# Data returned from the Stat call.
StatData = namedtuple("StatData", ["length"])


class LocalFileSystem(object):
    """Provides local fileystem access."""

    def exists(self, filename):
        """Determines whether a path exists or not."""
        return os.path.exists(compat.as_bytes(filename))

    def join(self, path, *paths):
        """Join paths with path delimiter."""
        return os.path.join(path, *paths)

    def read(self, filename, binary_mode=False, size=None, offset=None):
        """Reads contents of a file to a string.

        Args:
            filename: string, a path
            binary_mode: bool, read as binary if True, otherwise text
            size: int, number of bytes or characters to read, otherwise
                read all the contents of the file from the offset
            offset: int, offset into file to read from, otherwise read
                from the very beginning

        Returns:
            Subset of the contents of the file as a string or bytes.
        """
        mode = "rb" if binary_mode else "r"
        with io.open(filename, mode) as f:
            if offset is not None:
                f.seek(offset)
            if size is not None:
                return f.read(size)
            else:
                return f.read()

    def glob(self, filename):
        """Returns a list of files that match the given pattern(s)."""
        if isinstance(filename, six.string_types):
            return [
                # Convert the filenames to string from bytes.
                compat.as_str_any(matching_filename)
                for matching_filename in py_glob.glob(
                    compat.as_bytes(filename))
            ]
        else:
            return [
                # Convert the filenames to string from bytes.
                compat.as_str_any(matching_filename)
                for single_filename in filename
                for matching_filename in py_glob.glob(
                    compat.as_bytes(single_filename))
            ]

    def isdir(self, dirname):
        """Returns whether the path is a directory or not."""
        return os.path.isdir(compat.as_bytes(dirname))

    def listdir(self, dirname):
        """Returns a list of entries contained within a directory."""
        if not self.isdir(dirname):
            raise errors.NotFoundError(None, None, "Could not find directory")

        entries = os.listdir(compat.as_str_any(dirname))
        entries = [compat.as_str_any(item) for item in entries]
        return entries

    def stat(self, filename):
        """Returns file statistics for a given path."""
        # NOTE: Size of the file is given by .st_size as returned from
        # os.stat(), but we convert to .length
        try:
            len = os.stat(compat.as_bytes(filename)).st_size
        except OSError:
            raise errors.NotFoundError(None, None, "Could not find file")
        return StatData(len)


class S3FileSystem(object):
    """Provides filesystem access to S3."""

    def __init__(self):
        if not boto3:
            raise ImportError("boto3 must be installed for S3 support.")

    def bucket_and_path(self, url):
        """Split an S3-prefixed URL into bucket and path."""
        url = compat.as_str_any(url)
        if url.startswith("s3://"):
            url = url[len("s3://"):]
        idx = url.index("/")
        bucket = url[:idx]
        path = url[(idx + 1):]
        return bucket, path

    def exists(self, filename):
        """Determines whether a path exists or not."""
        client = boto3.client("s3")
        bucket, path = self.bucket_and_path(filename)
        r = client.list_objects(Bucket=bucket, Prefix=path, Delimiter="/")
        if r.get("Contents") or r.get("CommonPrefixes"):
            return True
        return False

    def join(self, path, *paths):
        """Join paths with a slash."""
        return "/".join((path,) + paths)

    def read(self, filename, binary_mode=False, size=None, offset=None):
        """Reads contents of a file to a string.

        Args:
            filename: string, a path
            binary_mode: bool, read as binary if True, otherwise text
            size: int, number of bytes or characters to read, otherwise
                read all the contents of the file from the offset
            offset: int, offset into file to read from, otherwise read
                from the very beginning

        Returns:
            Subset of the contents of the file as a string or bytes.
        """
        s3 = boto3.resource("s3")
        bucket, path = self.bucket_and_path(filename)
        args = {}
        endpoint = 0
        if size is not None or offset is not None:
            if offset is None:
                offset = 0
            endpoint = '' if size is None else (offset + size)
            args['Range'] = 'bytes={}-{}'.format(offset, endpoint)
        try:
            stream = s3.Object(bucket, path).get(**args)['Body'].read()
        except botocore.exceptions.ClientError as exc:
            if exc.response['Error']['Code'] == '416':
                if size is not None:
                    # Asked for too much, so request just to the end. Do this
                    # in a second request so we don't check length in all cases.
                    client = boto3.client("s3")
                    obj = client.head_object(Bucket=bucket, Key=path)
                    len = obj['ContentLength']
                    endpoint = min(len, offset + size)
                if offset == endpoint:
                    # Asked for no bytes, so just return empty
                    stream = b''
                else:
                    args['Range'] = 'bytes={}-{}'.format(offset, endpoint)
                    stream = s3.Object(bucket, path).get(**args)['Body'].read()
            else:
                raise
        if binary_mode:
            return bytes(stream)
        else:
            return stream.decode('utf-8')

    def glob(self, filename):
        """Returns a list of files that match the given pattern(s)."""
        # Only support prefix with * at the end and no ? in the string
        star_i = filename.find('*')
        quest_i = filename.find('?')
        if quest_i >= 0:
            raise NotImplementedError(
                "{} not supported by compat glob".format(filename))
        if star_i != len(filename) - 1:
            # Just return empty so we can use glob from directory watcher
            #
            # TODO: Remove and instead handle in GetLogdirSubdirectories.
            # However, we would need to handle it for all non-local registered
            # filesystems in some way.
            return []
        filename = filename[:-1]
        client = boto3.client("s3")
        bucket, path = self.bucket_and_path(filename)
        p = client.get_paginator("list_objects")
        keys = []
        for r in p.paginate(Bucket=bucket, Prefix=path):
            for o in r.get("Contents", []):
                key = o["Key"][len(path):]
                if key:  # Skip the base dir, which would add an empty string
                    keys.append(filename + key)
        return keys

    def isdir(self, dirname):
        """Returns whether the path is a directory or not."""
        client = boto3.client("s3")
        bucket, path = self.bucket_and_path(dirname)
        if not path.endswith("/"):
            path += "/"  # This will now only retrieve subdir content
        r = client.list_objects(Bucket=bucket, Prefix=path, Delimiter="/")
        if r.get("Contents") or r.get("CommonPrefixes"):
            return True
        return False

    def listdir(self, dirname):
        """Returns a list of entries contained within a directory."""
        client = boto3.client("s3")
        bucket, path = self.bucket_and_path(dirname)
        p = client.get_paginator("list_objects")
        if not path.endswith("/"):
            path += "/"  # This will now only retrieve subdir content
        keys = []
        for r in p.paginate(Bucket=bucket, Prefix=path, Delimiter="/"):
            keys.extend(o["Prefix"][len(path):-1] for o in r.get("CommonPrefixes", []))
            for o in r.get("Contents", []):
                key = o["Key"][len(path):]
                if key:  # Skip the base dir, which would add an empty string
                    keys.append(key)
        return keys

    def stat(self, filename):
        """Returns file statistics for a given path."""
        # NOTE: Size of the file is given by ContentLength from S3,
        # but we convert to .length
        client = boto3.client("s3")
        bucket, path = self.bucket_and_path(filename)
        try:
            obj = client.head_object(Bucket=bucket, Key=path)
            return StatData(obj['ContentLength'])
        except botocore.exceptions.ClientError as exc:
            if exc.response['Error']['Code'] == '404':
                raise errors.NotFoundError(None, None, "Could not find file")
            else:
                raise


register_filesystem("", LocalFileSystem())
if S3_ENABLED:
    register_filesystem("s3", S3FileSystem())


class GFile(object):
    # Only methods needed for TensorBoard are implemented.

    def __init__(self, filename, mode):
        if mode not in ('r', 'rb', 'br'):
            raise NotImplementedError(
                "mode {} not supported by compat GFile".format(mode))
        self.filename = compat.as_bytes(filename)
        self.buff_chunk_size = _DEFAULT_BLOCK_SIZE
        self.buff = None
        self.buff_offset = 0
        self.offset = 0
        self.binary_mode = (mode != 'r')

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.buff = None
        self.buff_offset = 0
        self.offset = 0

    def __iter__(self):
        return self

    def _read_buffer_to_offset(self, new_buff_offset):
        old_buff_offset = self.buff_offset
        read_size = min(len(self.buff), new_buff_offset) - old_buff_offset
        self.offset += read_size
        self.buff_offset += read_size
        return self.buff[old_buff_offset:old_buff_offset + read_size]

    def read(self, n=None):
        result = None
        if self.buff and len(self.buff) > self.buff_offset:
            # read from local buffer
            if n is not None:
                chunk = self._read_buffer_to_offset(self.buff_offset + n)
                if len(chunk) == n:
                    return chunk
                result = chunk
                n -= len(chunk)
            else:
                # add all local buffer and update offsets
                result = self._read_buffer_to_offset(len(self.buff))

        # read from filesystem
        fs = get_filesystem(self.filename)
        read_size = max(self.buff_chunk_size, n) if n is not None else None
        self.buff = fs.read(self.filename, self.binary_mode,
                            read_size, self.offset)
        self.buff_offset = 0

        # add from filesystem
        if n is not None:
            chunk = self._read_buffer_to_offset(n)
        else:
            # add all local buffer and update offsets
            chunk = self._read_buffer_to_offset(len(self.buff))
        result = result + chunk if result else chunk

        return result

    def __next__(self):
        line = None
        while True:
            if not self.buff:
                # read one unit into the buffer
                line = self.read(1)
                if line and (line[-1] == '\n' or not self.buff):
                    return line
                if not self.buff:
                    raise StopIteration()
            else:
                index = self.buff.find('\n', self.buff_offset)
                if index != -1:
                    # include line until now plus newline
                    chunk = self.read(index + 1 - self.buff_offset)
                    line = line + chunk if line else chunk
                    return line

                # read one unit past end of buffer
                chunk = self.read(len(self.buff) + 1 - self.buff_offset)
                line = line + chunk if line else chunk
                if line and (line[-1] == '\n' or not self.buff):
                    return line
                if not self.buff:
                    raise StopIteration()

    def next(self):
        return self.__next__()

    def close(self):
        pass


def exists(filename):
    """Determines whether a path exists or not.

    Args:
      filename: string, a path

    Returns:
      True if the path exists, whether its a file or a directory.
      False if the path does not exist and there are no filesystem errors.

    Raises:
      errors.OpError: Propagates any errors reported by the FileSystem API.
    """
    return get_filesystem(filename).exists(filename)


def glob(filename):
    """Returns a list of files that match the given pattern(s).

    Args:
      filename: string or iterable of strings. The glob pattern(s).

    Returns:
      A list of strings containing filenames that match the given pattern(s).

    Raises:
      errors.OpError: If there are filesystem / directory listing errors.
    """
    return get_filesystem(filename).glob(filename)


def isdir(dirname):
    """Returns whether the path is a directory or not.

    Args:
      dirname: string, path to a potential directory

    Returns:
      True, if the path is a directory; False otherwise
    """
    return get_filesystem(dirname).isdir(dirname)


def listdir(dirname):
    """Returns a list of entries contained within a directory.

    The list is in arbitrary order. It does not contain the special entries "."
    and "..".

    Args:
      dirname: string, path to a directory

    Returns:
      [filename1, filename2, ... filenameN] as strings

    Raises:
      errors.NotFoundError if directory doesn't exist
    """
    return get_filesystem(dirname).listdir(dirname)


def walk(top, topdown=True, onerror=None):
    """Recursive directory tree generator for directories.

    Args:
      top: string, a Directory name
      topdown: bool, Traverse pre order if True, post order if False.
      onerror: optional handler for errors. Should be a function, it will be
        called with the error as argument. Rethrowing the error aborts the walk.

    Errors that happen while listing directories are ignored.

    Yields:
      Each yield is a 3-tuple:  the pathname of a directory, followed by lists of
      all its subdirectories and leaf files.
      (dirname, [subdirname, subdirname, ...], [filename, filename, ...])
      as strings
    """
    top = compat.as_str_any(top)
    fs = get_filesystem(top)
    try:
        listing = listdir(top)
    except errors.NotFoundError as err:
        if onerror:
            onerror(err)
        else:
            return

    files = []
    subdirs = []
    for item in listing:
        full_path = fs.join(top, compat.as_str_any(item))
        if isdir(full_path):
            subdirs.append(item)
        else:
            files.append(item)

    here = (top, subdirs, files)

    if topdown:
        yield here

    for subdir in subdirs:
        joined_subdir = fs.join(top, compat.as_str_any(subdir))
        for subitem in walk(joined_subdir, topdown, onerror=onerror):
            yield subitem

    if not topdown:
        yield here


def stat(filename):
    """Returns file statistics for a given path.

    Args:
      filename: string, path to a file

    Returns:
      FileStatistics struct that contains information about the path

    Raises:
      errors.OpError: If the operation fails.
    """
    return get_filesystem(filename).stat(filename)
