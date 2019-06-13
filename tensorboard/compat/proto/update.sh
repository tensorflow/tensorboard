#!/bin/bash
# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

if [ $# -ne 1 ]; then
  echo "usage: $0 <tensorflow-root-dir>" >&2
  exit 1
fi

rsync --existing "$1"/tensorflow/core/framework/*.proto tensorboard/compat/proto/
rsync --existing "$1"/tensorflow/core/protobuf/*.proto tensorboard/compat/proto/
rsync --existing "$1"/tensorflow/core/profiler/*.proto tensorboard/compat/proto/
rsync --existing "$1"/tensorflow/core/util/*.proto tensorboard/compat/proto/
rsync --existing "$1"/tensorflow/python/framework/*.proto tensorboard/compat/proto/

# Rewrite file paths and package names.
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec perl -pi \
  -e 's|tensorflow/core/framework|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/core/protobuf|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/core/profiler|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/core/util|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/python/framework|tensorboard/compat/proto|g;' \
  -e 's|package tensorflow.tfprof;|package tensorboard;|g;' \
  -e 's|package tensorflow;|package tensorboard;|g;' \
  -e 's|tensorflow\.DataType|tensorboard.DataType|g;' \
  -e 's|tensorflow\.TensorShapeProto|tensorboard.TensorShapeProto|g;' \
  {} +

echo "Protos in tensorboard/compat/proto/ updated! You can now add and commit them."
