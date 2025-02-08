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
# The "TSL" protos are now in their  own repo, but they are included as a
# "vendored" package within TF. This dir contains protos that are imported with
# the xla/tsl/protobuf path that is replaced by the command below.
rsync --existing "$1"/third_party/xla/xla/tsl/protobuf/*.proto tensorboard/compat/proto/

# Rewrite file paths and package names and disable LINT checks.
#
# NOTE: Keep replacements here in sync with PROTO_REPLACEMENTS in proto_test.py.
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec perl -pi \
  -e 's|tensorflow/core/framework|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/core/protobuf|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/core/profiler|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/core/util|tensorboard/compat/proto|g;' \
  -e 's|tensorflow/python/framework|tensorboard/compat/proto|g;' \
  -e 's|xla/tsl/protobuf|tensorboard/compat/proto|g;' \
  -e 's|package tensorflow.tfprof;|package tensorboard;|g;' \
  -e 's|package tensorflow;|package tensorboard;|g;' \
  -e 's|tensorflow\.DataType|tensorboard.DataType|g;' \
  -e 's|tensorflow\.TensorProto|tensorboard.TensorProto|g;' \
  -e 's|tensorflow\.TensorShapeProto|tensorboard.TensorShapeProto|g;' \
  -e 's|\/\/ LINT\.|// DISABLED.|g;' \
  {} +


# Update dependency graph.
(
  cd tensorboard/compat/proto/

  {
    # Keep all organic content from the build file...
    sed -n '/AUTOMATICALLY GENERATED/q;p' BUILD
    printf '%s\n' \
      '# DO NOT EDIT: This line and rest of file are AUTOMATICALLY GENERATED' \
      '# by tensorboard/compat/proto/update.sh.' \
      ''

    # ...then regenerate the individual proto targets...
    for f in *.proto; do
      printf 'tb_proto_library(\n'
      printf '    name = "%s",\n' "${f%.proto}"
      printf '    srcs = ["%s"],\n' "$f"
      # Generate one dep for each imported proto.
      if grep -q '^import\( public\)* "tensorboard/' "$f"; then
        printf '    deps = [\n'
        grep '^import\( public\)* "tensorboard/' "$f" | sort |
          sed -e 's#.*compat/proto/\([^.]*\).*#        ":\1",#'
        printf '    ],\n'
      fi
      # Generate one export for each public imported proto. The exports are
      # unused in open source but needed for our internal build.
      if grep -q '^import public "tensorboard/' "$f"; then
        printf '    exports = [\n'
        grep '^import public "tensorboard/' "$f" | sort |
          sed -e 's#.*compat/proto/\([^.]*\).*#        ":\1",#'
        printf '    ],\n'
      fi
      printf ')\n\n'
    done

    # ...as well as `protos_all`.
    printf '%s\n' \
      '# Protobuf files copied from the main TensorFlow repository.' \
      '# Keep this list synced with proto_test.py' \
      ;
    printf 'tb_proto_library(\n'
    printf '    name = "protos_all",\n'
    printf '    srcs = [],\n'
    printf '    visibility = ["//visibility:public"],\n'
    printf '    deps = [\n'
    for f in *.proto; do
      printf '        ":%s",\n' "${f%.proto}"
    done | sort
    printf '    ],\n'
    printf ')\n'
  } | expand -t4 >BUILD.new
  mv BUILD.new BUILD

  # We made an effort to be style-compliant above, but try to run buildifier if
  # available, just in case.
  if command -v buildifier >/dev/null 2>/dev/null; then
    buildifier BUILD
  else
    printf >&2 'warning: buildifier(1) not found; tensorboard/compat/proto/BUILD may have lint errors\n'
  fi
)

echo "Protos in tensorboard/compat/proto/ updated! You can now add and commit them."
