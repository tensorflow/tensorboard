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
TEST_PORT=0
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
elif [[ "${PY_VERSION}" == 3 ]]; then
  virtualenv -p python3 "${VENV_TMP_DIR}"
fi

echo
echo "Activating virtualenv at ${VENV_TMP_DIR}"
echo

export VIRTUAL_ENV="${VENV_TMP_DIR}"
export VENV_BIN_DIR="${VENV_TMP_DIR}/bin"
export PATH="${VENV_BIN_DIR}:${PATH}"
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

pip install tf-nightly

echo
echo "Installing the just-built tensorboard pip package"
echo

if [[ "${PY_VERSION}" == 2 ]]; then
  pip install "${PIP_TMP_DIR}"/tensorboard*-py2-*.whl
elif [[ "${PY_VERSION}" == 3 ]]; then
  pip install "${PIP_TMP_DIR}"/tensorboard*-py3-*.whl
fi

echo
echo "Calling tensorboard public python APIs"
echo

# Check that we can now use TensorBoard's public python APIs as installed with
# the pip package. To do this we must cd away from the bazel workspace directory
# to one that doesn't have a local 'tensorboard' python module hierarchy.
TEST_API_CALL="
import tensorboard as tb
tb.summary.scalar_pb('test', 42)
from tensorboard.plugins.projector import visualize_embeddings
from tensorboard.plugins.beholder import Beholder, BeholderHook
"

echo "  python>>> $TEST_API_CALL"
echo
(cd "${VENV_TMP_DIR}" && python -c "$TEST_API_CALL")

# Check tensorboard binary path.
TB_BIN_PATH="${VENV_BIN_DIR}/tensorboard"
if ! [[ -x "${TB_BIN_PATH}" ]]; then
  die "ERROR: No tensorboard binary found after installing tensorboard pip package."
fi

# Start TensorBoard running in the background
TMP_LOG_OUTPUT=${PIP_TMP_DIR}/output.log
TMP_LOGDIR=$(mktemp -d --suffix _tensorboard_logdir)
tensorboard --host=localhost --port="${TEST_PORT}" --logdir="${TMP_LOGDIR}" \
  >${TMP_LOG_OUTPUT} 2>&1 &
TB_PID=$!

echo
echo "Waiting for tensorboard binary to start up..."
echo

# Wait until the binary has printed its serving URL so we know that it's
# accessible and which port it's running on.
while true; do
  if ! ps -p $TB_PID >/dev/null 2>&1; then
    echo
    echo "TensorBoard exited unexpected, printing logs:"
    echo "============================================="
    cat ${TMP_LOG_OUTPUT}
    echo "============================================="
    exit 1
  fi
  TB_URL=$(grep -o -m 1 -E 'http://localhost:[0-9]+' ${TMP_LOG_OUTPUT} || true)
  if [[ -n "${TB_URL}" ]]; then
    break
  fi
  sleep 1
done

echo
echo "Started tensorboard binary (pid ${TB_PID}) at ${TB_URL}"
echo

test_access_url() {
  # Attempt to fetch given URL till an HTTP 200 status or reaching $NUM_RETRIES
  #
  # Retrying occur with a 1-second delay.
  #
  # Global variable(s) used: ${NUM_RETIRES}.
  #
  # Usage:
  #   test_access_url <URL>
  # E.g.,
  #   test_access_url http://localhost:6006/
  local test_url="$1"

  echo
  echo "Sending test HTTP requests at URL: ${test_url} (${NUM_RETRIES} retries)"
  echo

  local retry_counter=0
  while [[ "${retry_counter}" -lt "${NUM_RETRIES}" ]]; do
    local status_code="$(curl -Is "${test_url}" | head -1 | cut -d ' ' -f 2)"
    if [[ "${status_code}" == 200 ]]; then
      echo
      echo "Request to ${test_url} succeeded (200)!"
      echo
      return
    else
      : $(( retry_counter++ ))
      echo "Request to ${test_url} failed. Will retry in 1 second..."
      sleep 1
    fi
  done

  printf >&2 \
      "ERROR: Failed to get 200 response status from %s in %d retries.\n" \
      "${test_url}" "${NUM_RETRIES}"
  return 1
}

TEST_URL_FAILED=0
test_access_url "${TB_URL}/data/logdir" || TEST_URL_FAILED=1
test_access_url "${TB_URL}" || TEST_URL_FAILED=1

echo
echo "Terminating tensorboard binary at pid ${TB_PID}"
echo

kill -9 "${TB_PID}"
wait "${TB_PID}" 2>/dev/null || true  # Wait to suppress "Killed" message.

echo
if [[ "${TEST_URL_FAILED}" == 0 ]]; then
  # Clean up.
  rm -r "${VENV_TMP_DIR}"
  rm -r "${PIP_TMP_DIR}"
  rm -r "${TMP_LOGDIR}"
  echo "=== Smoke test of tensorboard PIP package PASSED ==="
else
  die "=== Smoke test of tensorboard PIP package FAILED ==="
fi
