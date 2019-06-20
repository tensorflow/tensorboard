#!/bin/sh
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

set -eu

usage() {
  cat <<EOF
usage: build_pip_package OUTPUT_DIR

Build TensorBoard Pip packages and store the resulting wheel files
into OUTPUT_DIR.

Arguments:
  OUTPUT_DIR: Existing directory into which to store *.whl files.
EOF
}

if [ $# -ne 1 ]; then
  usage 2>&1
  exit 1
fi
output_dir="$1"

if [ -z "${RUNFILES+set}" ]; then
  RUNFILES="$(CDPATH="" cd -- "$0.runfiles" && pwd)"
fi

if [ "$(uname)" = "Darwin" ]; then
  sedi="sed -i ''"
else
  sedi="sed -i"
fi

set -x
command -v virtualenv >/dev/null
[ -d "${RUNFILES}" ]

if [ "$(uname)" = "Darwin" ]; then
  workdir="$(mktemp -d -t tensorboard-pip)"
else
  workdir="$(mktemp -d -p /tmp -t tensorboard-pip.XXXXXXXXXX)"
fi
cd "${workdir}"

cleanup() {
  rm -r "${workdir}"
}
trap cleanup EXIT

cp -LR "${RUNFILES}/org_tensorflow_tensorboard/tensorboard" .
mv -f "tensorboard/pip_package/LICENSE" .
mv -f "tensorboard/pip_package/MANIFEST.in" .
mv -f "tensorboard/pip_package/README.rst" .
mv -f "tensorboard/pip_package/setup.cfg" .
mv -f "tensorboard/pip_package/setup.py" .
rm -rf "tensorboard/pip_package"

rm -f tensorboard/tensorboard  # bazel py_binary sh wrapper
chmod -x LICENSE  # bazel symlinks confuse cp
find . -name __init__.py -exec chmod -x {} +  # which goes for all genfiles

mkdir -p tensorboard/_vendor
>tensorboard/_vendor/__init__.py
cp -LR "${RUNFILES}/org_html5lib/html5lib" tensorboard/_vendor
cp -LR "${RUNFILES}/org_mozilla_bleach/bleach" tensorboard/_vendor
# Vendor tensorflow-serving-api because it depends directly on TensorFlow.
# TODO(nickfelt): de-vendor if they're able to relax that dependency.
cp -LR "${RUNFILES}/org_tensorflow_serving_api/tensorflow_serving" tensorboard/_vendor

chmod -R u+w,go+r .

find tensorboard -name \*.py -exec $sedi -e '
    s/^import html5lib$/from tensorboard._vendor import html5lib/
    s/^from html5lib/from tensorboard._vendor.html5lib/
    s/^import bleach$/from tensorboard._vendor import bleach/
    s/^from bleach/from tensorboard._vendor.bleach/
    s/from tensorflow_serving/from tensorboard._vendor.tensorflow_serving/
  ' {} +

virtualenv venv
export VIRTUAL_ENV=venv
export PATH="${PWD}/venv/bin:${PATH}"
unset PYTHON_HOME

# Require wheel for bdist_wheel command, and setuptools 36.2.0+ so that
# env markers are handled (https://github.com/pypa/setuptools/pull/1081)
pip install -qU wheel 'setuptools>=36.2.0'

python setup.py bdist_wheel --python-tag py2 >/dev/null
python setup.py bdist_wheel --python-tag py3 >/dev/null

cp ./dist/*.whl "${output_dir}"
