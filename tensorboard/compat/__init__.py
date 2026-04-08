# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

"""Compatibility interfaces for TensorBoard.

This module provides logic for importing variations on the TensorFlow
APIs while deferring the actual import work until callers request `tf`
or `tf2`.
"""

import importlib


def _resolve_tf():
    """Provide the root module of a TF-like API for use within TensorBoard."""
    try:
        importlib.import_module("tensorboard.compat.notf")
    except ImportError:
        try:
            import tensorflow

            return tensorflow
        except ImportError:
            pass
    return importlib.import_module("tensorboard.compat.tensorflow_stub")


def _resolve_tf2():
    """Provide the root module of a TF-2.0 API for use within TensorBoard."""
    tf = __getattr__("tf")
    if hasattr(tf, "compat") and hasattr(tf.compat, "v2"):
        return tf.compat.v2
    raise ImportError("cannot import tensorflow 2.0 API")


def __getattr__(name):
    if name == "tf":
        module = _resolve_tf()
        globals()[name] = module
        return module
    if name == "tf2":
        module = _resolve_tf2()
        globals()[name] = module
        return module
    raise AttributeError("module %r has no attribute %r" % (__name__, name))


def __dir__():
    return sorted(set(globals()) | {"tf", "tf2"})


__all__ = ["tf", "tf2"]
