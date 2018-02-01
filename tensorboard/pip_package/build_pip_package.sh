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

die() {
  printf >&2 '%s\n' "$1"
  exit 1
}

function main() {
  if [ $# -lt 1 ] ; then
    die "ERROR: no destination dir provided"
  fi

  DEST=$1
  TMPDIR=$(mktemp -d -t --suffix _tensorboard_pip_pkg)
  TMPVENVDIR="${TMPDIR}/venv"
  RUNFILES="bazel-bin/tensorboard/pip_package/build_pip_package.runfiles/org_tensorflow_tensorboard"

  # Check that virtualenv is installed.
  if [[ -z "$(which virtualenv)" ]]; then
    die "ERROR: virtualenv is required, but does not appear to be installed."
  fi

  echo $(date) : "=== Using tmpdir: ${TMPDIR}"

  bazel build //tensorboard/pip_package:build_pip_package

  if [ ! -d bazel-bin/tensorboard ]; then
    die "ERROR: Could not find bazel-bin.  Did you run from the build root?"
  fi

  cp "${RUNFILES}/tensorboard/pip_package/setup.py" "${TMPDIR}"
  cp "${RUNFILES}/tensorboard/pip_package/setup.cfg" "${TMPDIR}"
  cp "${RUNFILES}/tensorboard/pip_package/MANIFEST.in" "${TMPDIR}"
  cp -R "${RUNFILES}/tensorboard" "${TMPDIR}"

  pushd ${TMPDIR} >/dev/null
  rm -f MANIFEST

  echo $(date) : "=== Activating virtualev ==="
  virtualenv "${TMPVENVDIR}"
  export VIRTUAL_ENV="${TMPVENVDIR}"
  export PATH="${TMPVENVDIR}/bin:${PATH}"
  unset PYTHON_HOME

  # Require wheel for bdist_wheel command, and setuptools 36.2.0+ so that
  # env markers are handled (https://github.com/pypa/setuptools/pull/1081)
  pip install -U wheel setuptools>=36.2.0

  echo $(date) : "=== Building python2 wheel in $PWD"
  python setup.py bdist_wheel --python-tag py2 >/dev/null
  echo $(date) : "=== Building python3 wheel in $PWD"
  python setup.py bdist_wheel --python-tag py3 >/dev/null
  mkdir -p ${DEST}
  cp dist/* ${DEST}
  popd >/dev/null
  rm -rf ${TMPDIR}
  echo $(date) : "=== Output wheel files are in: ${DEST}"
}

main "$@"
