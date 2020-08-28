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
"""Utilities for working with `argparse` in a portable way."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import contextlib
import gettext


@contextlib.contextmanager
def allow_missing_subcommand():
    """Make Python 2.7 behave like Python 3 w.r.t. default subcommands.

    The behavior of argparse was changed [1] [2] in Python 3.3. When a
    parser defines subcommands, it used to be an error for the user to
    invoke the binary without specifying a subcommand. As of Python 3.3,
    this is permitted. This monkey patch backports the new behavior to
    earlier versions of Python.

    This context manager need only be used around `parse_args`; parsers
    may be constructed and configured outside of the context manager.

    [1]: https://github.com/python/cpython/commit/f97c59aaba2d93e48cbc6d25f7ff9f9c87f8d0b2
    [2]: https://bugs.python.org/issue16308
    """

    real_error = argparse.ArgumentParser.error

    # This must exactly match the error message raised by Python 2.7's
    # `argparse` when no subparser is given. This is `argparse.py:1954` at
    # Git tag `v2.7.16`.
    ignored_message = gettext.gettext("too few arguments")

    def error(*args, **kwargs):
        # Expected signature is `error(self, message)`, but we retain more
        # flexibility to be forward-compatible with implementation changes.
        if "message" not in kwargs and len(args) < 2:
            return real_error(*args, **kwargs)
        message = kwargs["message"] if "message" in kwargs else args[1]
        if message == ignored_message:
            return None
        else:
            return real_error(*args, **kwargs)

    argparse.ArgumentParser.error = error
    try:
        yield
    finally:
        argparse.ArgumentParser.error = real_error
