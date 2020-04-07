# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Utilities for measuring elapsed time."""

import contextlib
import logging
import threading
import time

from tensorboard.util import tb_logging

logger = tb_logging.get_logger()


def log_latency(region_name=None, log_level=None):
    """Log latency in a function or region.

    If no region name is passed, the result is a decorator. If a region
    name is passed, the result acts as either a context manager or a
    decorator at the caller's discretion. Thus, the following are all
    valid usages:

    >>> @log_latency()
    ... def function_1():
    ...     pass
    ...
    >>> @log_latency("custom_label")
    ... def function_2():
    ...     pass
    ...
    >>> def function_3():
    ...     with log_latency("region_within_function"):
    ...         pass
    ...

    Args:
        region_name: An optional string name to associate with this
            latency region. Optional if used as a decorator; required if
            used as a context manager.
        log_level: Optional integer logging level constant. Defaults to
            `logging.INFO`.

    Returns:
        A decorated version of the input callable, or a dual
        decorator/context manager with the input region name.
    """

    if log_level is None:
        log_level = logging.INFO

    if isinstance(region_name, str):
        return _log_latency(region_name, log_level)
    elif region_name is None:
        return _LogLatencyDecorator(log_level)
    else:
        msg = "region_name must be a string or `None`; got: %r" % (region_name,)
        if callable(region_name):
            msg += " (hint: write `@log_latency()` instead of `@log_latency`)"
        raise TypeError(msg)


class _ThreadLocalStore(threading.local):
    def __init__(self):
        self.nesting_level = 0


_store = _ThreadLocalStore()


@contextlib.contextmanager
def _log_latency(name, log_level):
    if not logger.isEnabledFor(log_level):
        yield
        return

    start_level = _store.nesting_level
    try:
        _store.nesting_level = start_level + 1
        indent = (" " * 2) * start_level
        thread = threading.current_thread()
        prefix = "%s[%x]%s" % (thread.name, thread.ident, indent)
        logger.log(log_level, "%s ENTER %s", prefix, name)

        started = time.time()
        yield
    finally:
        _store.nesting_level = start_level
        elapsed = time.time() - started
        logger.log(
            log_level, "%s EXIT %s - %0.6fs elapsed", prefix, name, elapsed,
        )


class _LogLatencyDecorator:
    """Decorator that raises a nice error if used as a context manager."""

    def __init__(self, log_level):
        self._log_level = log_level

    def __enter__(self):
        # Caller tried to use `with log_latency()` when they needed to
        # write `with log_latency("my_region_name")`. Let them know.
        raise TypeError(
            "log_latency() cannot be used as a context manager unless "
            "a region name is specified"
        )

    def __exit__(self, *exc_info):
        pass

    def __call__(self, func):
        qualname = getattr(func, "__qualname__", func)
        return _log_latency(qualname, self._log_level)(func)
