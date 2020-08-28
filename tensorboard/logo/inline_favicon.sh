#!/bin/sh
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

set -eu

# Replaces %TENSORBOARD_FAVICON_URI% with a data URI containing the
# image contents.
#
# Usage is like `awk(1)`: provide standard input or pass file paths as
# arguments, and expect results to stdout.

favicon_file="$0.runfiles/org_tensorflow_tensorboard/tensorboard/logo/favicon.png"
stat -- "${favicon_file}" >/dev/null  # ensure exists, with nice error text

mime_type=image/png
base64_contents="$(base64 "${favicon_file}" | tr -d '\n')"
data_uri="data:${mime_type};base64,${base64_contents}"

exec awk -v data_uri="${data_uri}" \
    '{ gsub("%TENSORBOARD_FAVICON_URI%", data_uri); print }' \
    "$@"
