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
"""Utilities for the plugin backend."""

import os


def can_serve_from_static(path):
    """Returns whether a filepath can be served from the static folder.

    Args:
        path: A string file path.
    """
    abs_path = os.path.abspath(path)
    container_dir_prefix = os.path.abspath("./static") + os.sep
    return abs_path.startswith(container_dir_prefix)
