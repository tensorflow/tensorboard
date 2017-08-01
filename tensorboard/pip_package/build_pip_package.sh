#!/usr/bin/env bash
# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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


set -e

function main() {
  if [ $# -lt 1 ] ; then
    echo "No destination dir provided"
    exit 1
  fi

  DEST=$1
  TMPDIR=$(mktemp -d -t tmp.XXXXXXXXXX)

  echo $(date) : "=== Using tmpdir: ${TMPDIR}"

  bazel build //tensorboard/pip_package:build_pip_package

  if [ ! -d bazel-bin/tensorboard ]; then
    echo "Could not find bazel-bin.  Did you run from the root of the build tree?"
    exit 1
  fi

  cp -R bazel-bin/tensorboard/pip_package/build_pip_package.runfiles/org_tensorflow_tensorboard/external "${TMPDIR}"
  cp -R bazel-bin/tensorboard/pip_package/build_pip_package.runfiles/org_tensorflow_tensorboard/tensorboard "${TMPDIR}"
  echo $(ls $TMPDIR)

  cp tensorboard/pip_package/MANIFEST.in ${TMPDIR}
  cp README.md ${TMPDIR}
  cp tensorboard/pip_package/setup.py ${TMPDIR}

  pushd ${TMPDIR}
  rm -f MANIFEST
  echo $(date) : "=== Building wheel"
  echo $(pwd)
  python setup.py bdist_wheel >/dev/null
  python3 setup.py bdist_wheel >/dev/null
  mkdir -p ${DEST}
  cp dist/* ${DEST}
  popd
  rm -rf ${TMPDIR}
  echo $(date) : "=== Output wheel file is in: ${DEST}"
}

main "$@"
