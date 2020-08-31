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

# Script to download Buildozer binary directly onto a build machine.

set -e

die() {
  printf >&2 "%s\n" "$1"
  exit 1
}

if [ "$#" -ne 3 ]; then
  die "Usage: $0 <buildtools-version> <sha256sum> <destination-file>"
fi

version="$1"
checksum="$2"
dest="$3"

mirror_url="http://mirror.tensorflow.org/github.com/bazelbuild/buildtools/releases/download/${version}/buildozer"
github_url="https://github.com/bazelbuild/buildtools/releases/download/${version}/buildozer"

exec "$(dirname "$0")/download_executable.sh" "${checksum}" "${dest}" \
    "${mirror_url}" "${github_url}"
