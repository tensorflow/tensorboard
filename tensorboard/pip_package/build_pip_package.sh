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
set -e
if [ -z "${RUNFILES}" ]; then
  RUNFILES="$(CDPATH= cd -- "$0.runfiles" && pwd)"
fi

if [ "$(uname)" = "Darwin" ]; then
  sedi="sed -i ''"
else
  sedi="sed -i"
fi

smoke() {
  TF_PACKAGE=tf-nightly
  if [ -n "$TF_VERSION" ]; then
    TF_PACKAGE="tensorflow==${TF_VERSION}"
  fi
  virtualenv -qp python$1 venv$1
  cd venv$1
  . bin/activate
  pip install -qU pip
  pip install -qU "$TF_PACKAGE"
  pip install -qU ../dist/*py$1*.whl >/dev/null
  # Test TensorBoard application
  [ -x ./bin/tensorboard ]  # Ensure pip package included binary
  mkfifo pipe
  tensorboard --port=0 --logdir=smokedir 2>pipe &
  perl -ne 'print STDERR;/http:.*:(\d+)/ and print $1.v10 and exit 0' <pipe >port
  curl -fs http://localhost:$(cat port) >index.html
  grep '<tf-tensorboard' index.html
  curl -fs http://localhost:$(cat port)/data/logdir >logdir.json
  grep 'smokedir' logdir.json
  kill $!
  # Test TensorBoard APIs
  python -c "
import tensorboard as tb
tb.summary.scalar_pb('test', 42)
from tensorboard.plugins.projector import visualize_embeddings
from tensorboard.plugins.beholder import Beholder, BeholderHook
"
  deactivate
  cd ..
  rm -rf venv$1
}

set -x
command -v curl >/dev/null
command -v perl >/dev/null
command -v python2 >/dev/null
command -v python3 >/dev/null
command -v virtualenv >/dev/null
[ -d "${RUNFILES}" ]

dest=/tmp/tensorboard
if [ ! -e $dest ]; then
  mkdir $dest
else
  dest="$(mktemp -d -p /tmp -t tensorboard-pip.XXXXXXXXXX)"
fi
cd "${dest}"

cp -LR "${RUNFILES}/org_tensorflow_tensorboard/tensorboard" .
mv -f "tensorboard/pip_package/LICENSE" .
mv -f "tensorboard/pip_package/MANIFEST.in" .
mv -f "tensorboard/pip_package/README.rst" .
mv -f "tensorboard/pip_package/setup.cfg" .
mv -f "tensorboard/pip_package/setup.py" .
rm -rf tensorboard/pip_package

rm -f tensorboard/tensorboard              # bazel py_binary sh wrapper
chmod -x LICENSE                           # bazel symlinks confuse cp
find . -name __init__.py | xargs chmod -x  # which goes for all genfiles

mkdir -p tensorboard/_vendor
touch tensorboard/_vendor/__init__.py
cp -LR "${RUNFILES}/org_html5lib/html5lib" tensorboard/_vendor
cp -LR "${RUNFILES}/org_mozilla_bleach/bleach" tensorboard/_vendor
# Vendor tensorflow-serving-api because it depends directly on TensorFlow.
# TODO(nickfelt): de-vendor if they're able to relax that dependency.
cp -LR "${RUNFILES}/org_tensorflow_serving_api/tensorflow_serving" tensorboard/_vendor

chmod -R u+w,go+r .

find tensorboard -name \*.py |
  xargs $sedi -e '
    s/^import html5lib$/from tensorboard._vendor import html5lib/
    s/^from html5lib/from tensorboard._vendor.html5lib/
    s/^import bleach$/from tensorboard._vendor import bleach/
    s/^from bleach/from tensorboard._vendor.bleach/
    s/from tensorflow_serving/from tensorboard._vendor.tensorflow_serving/
  '

virtualenv venv
export VIRTUAL_ENV=venv
export PATH="$PWD/venv/bin:${PATH}"
unset PYTHON_HOME

# Require wheel for bdist_wheel command, and setuptools 36.2.0+ so that
# env markers are handled (https://github.com/pypa/setuptools/pull/1081)
pip install -qU wheel 'setuptools>=36.2.0'

python setup.py bdist_wheel --python-tag py2 >/dev/null
python setup.py bdist_wheel --python-tag py3 >/dev/null

smoke 2
smoke 3

ls -hal "$PWD/dist"
