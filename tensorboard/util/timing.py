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


def log_latency(name_or_function, log_level=None):
    """Log latency in a function or region.

    This can act as a decorator: if passed a function, it returns a
    decorated version of the function. Otherwise, the argument is
    interpreted as a region name, and the result is either a context
    manager or a decorator at the caller's discretion. Thus, the
    following are all valid usages:

    >>> @log_latency
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
        name_or_function: A callable to decorate, or a string region
            name to use as a context manager or decorator.
        log_level: Optional integer logging level constant. Defaults to
            `logging.INFO`.

    Returns:
        A decorated version of the input callable, or a dual
        decorator/context manager with the input region name.
    """

    if log_level is None:
        log_level = logging.INFO
    if callable(name_or_function):
        original = name_or_function
        name = getattr(original, "__qualname__", original)
        return _log_latency(name, log_level)(original)
    else:
        return _log_latency(name_or_function, log_level)


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
