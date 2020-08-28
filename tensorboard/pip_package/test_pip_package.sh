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
  cat <<EOF
usage: test_pip_package [--tf-version VERSION]

Test pre-built TensorBoard Pip packages.

Options:
  --tf-version VERSION: Test against the provided version of TensorFlow,
      given as a Pip package specifier like "tensorflow==2.0.0a0" or
      "tf-nightly". If empty, will test without installing TensorFlow.
      Defaults to "tf-nightly".
EOF
}

main() {
  unset workdir
  trap cleanup EXIT
  parse_args "$@"
  set -x
  command -v curl >/dev/null
  command -v perl >/dev/null
  command -v virtualenv >/dev/null
  initialize_workdir
  extract_wheels
  smoke python3
}

cleanup() {
  if [ -n "${workdir+set}" ]; then
    rm -rf "${workdir}"
  fi
}

parse_args() {
  tf_version=tf-nightly
  pythons=all
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --help)
        usage
        exit 2
        ;;
      --tf-version)
        if [ $# -lt 2 ]; then
          printf >&2 'fatal: --tf-version given without argument\n'
          usage >&2
          exit 1
        fi
        tf_version="$2"
        shift
        shift
        ;;
      *)
        printf >&2 'fatal: unknown argument "%s"' "$1"
        usage >&2
        exit 1
        ;;
    esac
  done
  if [ -z "${RUNFILES+set}" ]; then
    RUNFILES="$(CDPATH="" cd -- "$0.runfiles" && pwd)"
  fi
}

initialize_workdir() {
  workdir="$(mktemp -d)"
  wheels="${workdir}/wheels"
  virtualenvs_root="${workdir}/virtualenvs"
  mkdir -p "${wheels}" "${virtualenvs_root}"
}

# Extract '*.whl' files from runfiles and put them into "${wheels}".
extract_wheels() {
  tar xzvf \
      "${RUNFILES}/org_tensorflow_tensorboard/tensorboard/pip_package/pip_packages.tar.gz" \
      -C "${wheels}"
}

# smoke PYTHON_BINARY: Run smoke tests against the provided Python.
smoke() (
  [ $# -eq 1 ]
  smoke_python="$1"
  py_major_version="$(
      "${smoke_python}" -c 'import sys; print(sys.version_info[0])'
  )"

  smoke_venv="${virtualenvs_root}/venv-${smoke_python}/"
  set +x
  printf '\n\n%70s\n' '' | tr ' ' '='
  if [ -z "${tf_version}" ]; then
    echo "Smoke testing with ${smoke_python} and no tensorflow..."
  else
    echo "Smoke testing with ${smoke_python} and ${tf_version}..."
  fi
  printf '\n'
  set -x

  command -v "${smoke_python}" >/dev/null
  virtualenv -qp "${smoke_python}" "${smoke_venv}"
  cd "${smoke_venv}"

  export VIRTUAL_ENV=venv
  export PATH="${smoke_venv}/bin:${PATH}"
  unset PYTHON_HOME
  pip install -qU pip

  if [ -n "${tf_version}" ]; then
    pip install -qU "${tf_version}"
    pip uninstall -qy tensorboard tb-nightly  # Drop any conflicting packages
  fi
  pip install -qU "${wheels}"/*py"${py_major_version}"*.whl
  pip freeze  # Log the results of pip installation

  # Test TensorBoard application
  [ -x ./bin/tensorboard ]  # Ensure pip package included binary
  mkfifo pipe
  tensorboard --port=0 --logdir=smokedir 2>pipe &
  perl -ne 'print STDERR;/http:.*:(\d+)/ and print $1.v10 and exit 0' <pipe >port
  curl -fs "http://localhost:$(cat port)" >index.html
  grep '<tb-webapp' index.html
  curl -fs "http://localhost:$(cat port)/data/logdir" >logdir.json
  grep 'smokedir' logdir.json
  curl -fs "http://localhost:$(cat port)/data/plugin/projector/runs" >projector_runs.json
  # logdir does not contain any checkpoints and thus an empty runs.
  grep '\[\]' projector_runs.json
  curl -fs "http://localhost:$(cat port)/data/plugin/projector/projector_binary.html" >projector_binary.html
  grep '<vz-projector-dashboard' projector_binary.html
  kill $!

  # Test TensorBoard APIs
  export TF_CPP_MIN_LOG_LEVEL=1  # Suppress spammy TF startup logging.
  python -c "
import tensorboard as tb
assert tb.__version__ == tb.version.VERSION
assert issubclass(tb.errors.NotFoundError, tb.errors.PublicError)
from tensorboard.plugins.projector import visualize_embeddings
tb.notebook.start  # don't invoke; just check existence
from tensorboard.plugins.hparams import summary_v2 as hp
hp.hparams_pb({'optimizer': 'adam', 'learning_rate': 0.02})
"
  if [ -n "${tf_version}" ]; then
    # Only test summary scalar and mesh summary
    python -c "
import tensorboard as tb
tb.summary.v1.scalar_pb('test', 42)
tb.summary.scalar('test v2', 1337)
from tensorboard.plugins.mesh import summary
"
  fi

  if [ -n "${tf_version}" ]; then
    test_tf_summary '.compat.v2'
    is_tf_2() {
      python -c "import tensorflow as tf; assert tf.__version__[:2] == '2.'" \
        >/dev/null 2>&1
    }
    if is_tf_2; then
      test_tf_summary ''
    fi
  fi
)

# Exhaustively test various sequences of importing tf.summary.
test_tf_summary() {
  # First argument is subpath to test, e.g. '' or '.compat.v2'.
  import_attr="import tensorflow as tf; a = tf${1}.summary; a.write; a.scalar"
  import_as="import tensorflow${1}.summary as b; b.write; b.scalar"
  import_from="from tensorflow${1} import summary as c; c.write; c.scalar"
  printf '%s\n' "${import_attr}" "${import_as}" "${import_from}" | python -
  printf '%s\n' "${import_attr}" "${import_from}" "${import_as}" | python -
  printf '%s\n' "${import_as}" "${import_attr}" "${import_from}" | python -
  printf '%s\n' "${import_as}" "${import_from}" "${import_attr}" | python -
  printf '%s\n' "${import_from}" "${import_attr}" "${import_as}" | python -
  printf '%s\n' "${import_from}" "${import_as}" "${import_attr}" | python -
}

main "$@"
