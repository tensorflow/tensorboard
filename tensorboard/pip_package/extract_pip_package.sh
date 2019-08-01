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

set -eu

usage() {
    cat <<'EOF'
usage: extract_pip_package [OUTPUT_DIR]

Extract TensorBoard wheel files into a given directory.

If OUTPUT_DIR is omitted, a temporary directory will be created, and its
path and contents printed to stdout.
EOF
}

tarball="$0.runfiles/org_tensorflow_tensorboard/tensorboard/pip_package/pip_packages.tar.gz"

case $# in
    0)
        tmpdir="$(mktemp -d)"
        tar xzf "${tarball}" -C "${tmpdir}"
        find "${tmpdir}"
        ;;
    1)
        tar xzf "${tarball}" -C "$1"
        ;;
    *)
        usage >&2
        exit 1
        ;;
esac
