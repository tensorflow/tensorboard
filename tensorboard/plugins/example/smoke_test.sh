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

set -eux
command -v virtualenv >/dev/null

workdir="$(mktemp -d)"
cd "${workdir}"

cleanup() {
  rm -r "${workdir}"
}
trap cleanup EXIT

cp -LR "${TEST_SRCDIR}/org_tensorflow_tensorboard/tensorboard/plugins/example/" \
    ./example-plugin/

mkdir tensorboard-wheels
tar xzvf \
    "${TEST_SRCDIR}/org_tensorflow_tensorboard/tensorboard/pip_package/pip_packages.tar.gz" \
    -C ./tensorboard-wheels/

virtualenv venv
export VIRTUAL_ENV=venv
export PATH="${PWD}/venv/bin:${PATH}"
unset PYTHON_HOME

# Require wheel for bdist_wheel command, and setuptools 36.2.0+ so that
# env markers are handled (https://github.com/pypa/setuptools/pull/1081)
pip install -qU wheel 'setuptools>=36.2.0'

(cd ./example-plugin && python setup.py bdist_wheel)
[ -f ./example-plugin/dist/*.whl ]  # just one wheel

<<<<<<< HEAD
py_major_version="$(python -c 'import sys; print(sys.version_info[0])')"
pip install tf-nightly-2.0-preview  # TODO(@wchargin): Other versions, too?
pip uninstall -y tensorboard tb-nightly  # drop conflicting packages
pip install ./tensorboard-wheels/*py"${py_major_version}"*.whl
pip install ./example-plugin/dist/*.whl

python -m tensorboard_plugin_example.demo

# Test tensorboard + tensorboard_plugin_example integration.
mkfifo pipe
tensorboard --port=0 --logdir=. 2>pipe &
perl -ne 'print STDERR;/http:.*:(\d+)/ and print $1.v10 and exit 0' <pipe >port
port="$(cat port)"
curl -fs "http://localhost:${port}/data/plugin/example/index.js" >index.js
diff -u example-plugin/tensorboard_plugin_example/static/index.js index.js

# Wait for data to be read so that the plugin becomes active.
for attempt in {1..5}; do
  sleep 1
  curl -fs "http://localhost:${port}/data/plugins_listing" >plugins_listing
  status="$(python3 -c '
import sys
import json
with open("plugins_listing") as infile:
  plugins = json.load(infile)
if "example" in plugins:
  print("active" if plugins["example"]["enabled"] else "inactive")
else:
  print("missing")
  sys.stderr.write("%s\n" % (plugins,))
  ')"
  if [ "${status}" = missing ]; then
    printf >&2 'example plugin not picked up by TensorBoard!\n'
    exit 1
  fi
done
if [ "${status}" != active ]; then
  printf >&2 'plugin data still not loaded; cannot verify that demo worked\n'
  exit 1
fi
grep -qF '"/data/plugin/example/index.js"' plugins_listing

curl -fs "http://localhost:${port}/data/plugin/example/tags" >tags
<<EOF tr -d '\n' | diff -u - tags
{"demo_logs": {"guestbook": {"description": "Sign your name!"}, "more_names": {"description": ""}}}
EOF

=======
# This plugin doesn't require TensorFlow, so we don't install it.
py_major_version="$(python -c 'import sys; print(sys.version_info[0])')"
pip install ./tensorboard-wheels/*py"${py_major_version}"*.whl
pip install ./example-plugin/dist/*.whl

# Test tensorboard + tensorboard_plugin_example integration.
mkfifo pipe
tensorboard --port=0 --logdir=smokedir 2>pipe &
perl -ne 'print STDERR;/http:.*:(\d+)/ and print $1.v10 and exit 0' <pipe >port
curl -fs "http://localhost:$(cat port)/data/plugins_listing" >plugins_listing
grep -F '"example":' plugins_listing
grep -F '"/data/plugin/example/index.js"' plugins_listing
curl -fs "http://localhost:$(cat port)/data/plugin/example/index.js" >index.js
diff -u example-plugin/tensorboard_plugin_example/static/index.js index.js
>>>>>>> afecb68b556b96e8262966208e39bb69ad9bf964
kill $!
