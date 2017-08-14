#!/bin/bash
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
# ==============================================================================
#
# Smoke test for building, installing and basic usage of tensorboard pip package.
#
# Usage:
#   pip_smoke_test.sh [--python3] [--retries <NUM_RETRIES>] [--port <PORT>]
#
# Note:
#   * This script requires virtualenv.

set -eu

die() {
  printf >&2 '%s\n' "$1"
  exit 1
}

PY_VERSION=2
TEST_PORT=6006
NUM_RETRIES=20
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "--python3" ]]; then
    PY_VERSION=3
  elif [[ "$1" == "--retries" ]]; then
    NUM_RETRIES="$2"
    shift
  elif [[ "$1" == "--port" ]]; then
    TEST_PORT="$2"
    shift
  else
    die "ERROR: Unrecognized argument $1"
  fi
  shift
done

echo
echo "=== Performing smoke test of tensorboard PIP package ==="
echo "Settings:"
echo "  PY_VERSION=${PY_VERSION}"
echo "  TEST_PORT=${TEST_PORT}"
echo "  NUM_RETRIES=${NUM_RETRIES}"
echo

# Check that virtualenv is installed.
if [[ -z "$(which virtualenv)" ]]; then
  die "ERROR: virtualenv is required, but does not appear to be installed."
fi

PIP_TMP_DIR=$(mktemp -d --suffix _tensorboard)

echo
echo "Building tensorboard pip package in directory: ${PIP_TMP_DIR}"
echo

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
bazel build tensorboard/pip_package:build_pip_package

# Create virtualenv directory, cleanly (i.e., no --system-site-packages).
VENV_TMP_DIR=$(mktemp -d --suffix _tensorboard_venv)

echo
echo "Creating virtualenv directory at: ${VENV_TMP_DIR}"
echo

if [[ "${PY_VERSION}" == 2 ]]; then
  virtualenv -p python "${VENV_TMP_DIR}"
  TF_NIGHTLY_URL='https://ci.tensorflow.org/view/Nightly/job/nightly-matrix-cpu/TF_BUILD_IS_OPT=OPT,TF_BUILD_IS_PIP=PIP,TF_BUILD_PYTHON_VERSION=PYTHON2,label=cpu-slave/lastSuccessfulBuild/artifact/pip_test/whl/tensorflow-1.head-cp27-none-linux_x86_64.whl'
elif [[ "${PY_VERSION}" == 3 ]]; then
  virtualenv -p python3 "${VENV_TMP_DIR}"
  TF_NIGHTLY_URL='https://ci.tensorflow.org/view/Nightly/job/nightly-matrix-cpu/TF_BUILD_IS_OPT=OPT,TF_BUILD_IS_PIP=PIP,TF_BUILD_PYTHON_VERSION=PYTHON3,label=cpu-slave/lastSuccessfulBuild/artifact/pip_test/whl/tensorflow-1.head-cp34-cp34m-linux_x86_64.whl'
fi

echo
echo "Activating virtualenv at ${VENV_TMP_DIR}"
echo

export VIRTUAL_ENV="${VENV_TMP_DIR}"
export PATH="${VENV_TMP_DIR}/bin:${PATH}"
unset PYTHON_HOME

echo
echo "Installing and upgrading pip packages required for wheel building"
echo

pip install --upgrade pip setuptools wheel

echo
echo "Creating tensorboard pip package in directory: ${PIP_TMP_DIR}"
echo

bazel-bin/tensorboard/pip_package/build_pip_package "${PIP_TMP_DIR}"

# Install the dependency, tensorflow, first.
echo
echo "Installing nightly tensorflow pip package."
echo

pip install "${TF_NIGHTLY_URL}"

echo
echo "Installing the just-built tensorboard pip package"
echo

if [[ "${PY_VERSION}" == 2 ]]; then
  pip install "${PIP_TMP_DIR}"/tensorflow_tensorboard*-py2-*.whl
elif [[ "${PY_VERSION}" == 3 ]]; then
  pip install "${PIP_TMP_DIR}"/tensorflow_tensorboard*-py3-*.whl
fi

# Check tensorboard binary path.
TB_BIN_PATH=$(which tensorboard)
if [[ -z ${TB_BIN_PATH} ]]; then
  die "ERROR: Cannot find tensorboard binary path after installing tensorboard pip package."
fi

TMP_LOGDIR=$(mktemp -d --suffix _tensorboard_logdir)
tensorboard --port="${TEST_PORT}" --logdir="${TMP_LOGDIR}" &
TB_PID=$!

TEST_URL="http://localhost:${TEST_PORT}/data/logdir"
echo
echo "tensorboard binary should be running at pid ${TB_PID}"
echo "Sending test HTTP requests at URL: ${TEST_URL} (${NUM_RETRIES} retries)"
echo

RETRY_COUNTER=0
REQUEST_SUCCEEDED=0
while [[ "${RETRY_COUNTER}" -lt "${NUM_RETRIES}" ]]; do
  sleep 1
  STATUS_CODE=$(curl -Is "${TEST_URL}" | head -1 | cut -d ' ' -f 2)
  if [[ "${STATUS_CODE}" == 200 ]]; then
    echo
    echo "Request to ${TEST_URL} succeeded (200)!"
    echo
    REQUEST_SUCCEEDED=1
    break
  else
    : $(( RETRY_COUNTER++ ))
    echo "Request to ${TEST_URL} failed. Will retry in 1 second..."
  fi
done

if [[ "${REQUEST_SUCCEEDED}" == 0 ]]; then
  die "ERROR: Failed to get 200 response status from ${TEST_URL} in ${NUM_RETRIES} retries."
fi

echo
echo "Terminating tensorboard binary at pid ${TB_PID}"
echo

kill -9 "${TB_PID}"

# Clean up.
rm -rf "${VENV_TMP_DIR}"
rm -rf "${PIP_TMP_DIR}"
rm -rf "${TMP_LOGDIR}"

echo
echo "=== Smoke test of tensorboard PIP package PASSED ==="
echo
