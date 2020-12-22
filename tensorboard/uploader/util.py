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
"""Utilities for use by the uploader command line tool."""


import datetime
import errno
import os
import os.path
import time


class RateLimiter(object):
    """Helper class for rate-limiting using a fixed minimum interval."""

    def __init__(self, interval_secs):
        """Constructs a RateLimiter that permits a tick() every
        `interval_secs`."""
        self._time = time  # Use property for ease of testing.
        self._interval_secs = interval_secs
        self._last_called_secs = 0

    def tick(self):
        """Blocks until it has been at least `interval_secs` since last
        tick()."""
        wait_secs = (
            self._last_called_secs + self._interval_secs - self._time.time()
        )
        if wait_secs > 0:
            self._time.sleep(wait_secs)
        self._last_called_secs = self._time.time()


def get_user_config_directory():
    """Returns a platform-specific root directory for user config settings."""
    # On Windows, prefer %LOCALAPPDATA%, then %APPDATA%, since we can expect the
    # AppData directories to be ACLed to be visible only to the user and admin
    # users (https://stackoverflow.com/a/7617601/1179226). If neither is set,
    # return None instead of falling back to something that may be world-readable.
    if os.name == "nt":
        appdata = os.getenv("LOCALAPPDATA")
        if appdata:
            return appdata
        appdata = os.getenv("APPDATA")
        if appdata:
            return appdata
        return None
    # On non-windows, use XDG_CONFIG_HOME if set, else default to ~/.config.
    xdg_config_home = os.getenv("XDG_CONFIG_HOME")
    if xdg_config_home:
        return xdg_config_home
    return os.path.join(os.path.expanduser("~"), ".config")


def make_file_with_directories(path, private=False):
    """Creates a file and its containing directories, if they don't already
    exist.

    If `private` is True, the file will be made private (readable only by the
    current user) and so will the leaf directory. Pre-existing contents of the
    file are not modified.

    Passing `private=True` is not supported on Windows because it doesn't support
    the relevant parts of `os.chmod()`.

    Args:
      path: str, The path of the file to create.
      private: boolean, Whether to make the file and leaf directory readable only
        by the current user.

    Raises:
      RuntimeError: If called on Windows with `private` set to True.
    """
    if private and os.name == "nt":
        raise RuntimeError("Creating private file not supported on Windows")
    try:
        path = os.path.realpath(path)
        leaf_dir = os.path.dirname(path)
        try:
            os.makedirs(leaf_dir)
        except OSError as e:
            if e.errno != errno.EEXIST:
                raise
        if private:
            os.chmod(leaf_dir, 0o700)
        open(path, "a").close()
        if private:
            os.chmod(path, 0o600)
    except EnvironmentError as e:
        raise RuntimeError("Failed to create file %s: %s" % (path, e))


def set_timestamp(pb, seconds_since_epoch):
    """Sets a `Timestamp` proto message to a floating point UNIX time.

    This is like `pb.FromNanoseconds(int(seconds_since_epoch * 1e9))` but
    without introducing floating-point error.

    Args:
      pb: A `google.protobuf.Timestamp` message to mutate.
      seconds_since_epoch: A `float`, as returned by `time.time`.
    """
    pb.seconds = int(seconds_since_epoch)
    pb.nanos = int(round((seconds_since_epoch % 1) * 10 ** 9))


def format_time(timestamp_pb, now=None):
    """Converts a `timestamp_pb2.Timestamp` to human-readable string.

    This always includes the absolute date and time, and for recent dates
    may include a relative time like "(just now)" or "(2 hours ago)". It
    should thus be used for ephemeral values. Use `format_time_absolute`
    if the output will be persisted.

    Args:
      timestamp_pb: A `google.protobuf.timestamp_pb2.Timestamp` value to
        convert to string. The input will not be modified.
      now: A `datetime.datetime` object representing the current time,
        used for determining relative times like "just now". Optional;
        defaults to `datetime.datetime.now()`.

    Returns:
      A string suitable for human consumption.
    """

    # Add and subtract a day for <https://bugs.python.org/issue29097>,
    # which breaks early datetime conversions on Windows for small
    # timestamps.
    dt = datetime.datetime.fromtimestamp(timestamp_pb.seconds + 86400)
    dt = dt - datetime.timedelta(seconds=86400)

    if now is None:
        now = datetime.datetime.now()
    ago = now.replace(microsecond=0) - dt

    def ago_text(n, singular, plural):
        return "%d %s ago" % (n, singular if n == 1 else plural)

    relative = None
    if ago < datetime.timedelta(seconds=5):
        relative = "just now"
    elif ago < datetime.timedelta(minutes=1):
        relative = ago_text(int(ago.total_seconds()), "second", "seconds")
    elif ago < datetime.timedelta(hours=1):
        relative = ago_text(int(ago.total_seconds()) // 60, "minute", "minutes")
    elif ago < datetime.timedelta(days=1):
        relative = ago_text(int(ago.total_seconds()) // 3600, "hour", "hours")

    relative_part = " (%s)" % relative if relative is not None else ""
    return str(dt) + relative_part


def format_time_absolute(timestamp_pb):
    """Converts a `timestamp_pb2.Timestamp` to UTC time string.

    This will always be of the form "2001-02-03T04:05:06Z".

    Args:
      timestamp_pb: A `google.protobuf.timestamp_pb2.Timestamp` value to
        convert to string. The input will not be modified.

    Returns:
      An RFC 3339 date-time string.
    """
    dt = datetime.datetime.utcfromtimestamp(timestamp_pb.seconds)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _ngettext(n, singular, plural):
    return "%d %s ago" % (n, singular if n == 1 else plural)
