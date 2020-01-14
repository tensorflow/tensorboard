#!/bin/sh
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

# Script to download a binary directly onto a build machine, with
# checksum verification.

set -e

die() {
  printf >&2 "%s\n" "$1"
  exit 1
}

if [ "$#" -lt 3 ]; then
  die "Usage: $0 <sha256sum> <destination-file> <url> [<url>...]"
fi

checksum="$1"
dest="$2"
shift 2

temp_dest="$(mktemp)"

for url; do
  wget -t 3 -O "${temp_dest}" "${url}" \
    && printf "%s  %s\n" "${checksum}" "${temp_dest}" | shasum -a 256 --check \
    || { rm -f "${temp_dest}"; continue; }
  mv "${temp_dest}" "${dest}"
  break
done


[ -f "${dest}" ]
chmod +x "${dest}"
ls -l "${dest}"
