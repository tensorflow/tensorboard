#!/bin/bash

set -e

# To find other protos you need run something like
#
#     find ../tensorflow/ -type f  -name 'event.proto'
#

# Copy all protos temporarily
cp ../tensorflow/tensorflow/core/framework/*.proto tensorboard/compat/proto/
cp ../tensorflow/tensorflow/core/protobuf/*.proto tensorboard/compat/proto/
cp ../tensorflow/tensorflow/core/profiler/*.proto tensorboard/compat/proto/
cp ../tensorflow/tensorflow/core/util/*.proto tensorboard/compat/proto/
cp ../tensorflow/tensorflow/python/framework/*.proto tensorboard/compat/proto/

# Only keep those that update
# TODO: Might want to do this more selectively
git clean -fdx

# Replace paths internally
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/framework|tensorboard/compat/proto|g' {} +
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/protobuf|tensorboard/compat/proto|g' {} +
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/profiler|tensorboard/compat/proto|g' {} +
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/util|tensorboard/compat/proto|g' {} +
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/python/framework|tensorboard/compat/proto|g' {} +
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|package tensorflow.tfprof;|package tensorboard;|g' {} +
find tensorboard/compat/proto/ -type f  -name '*.proto' -exec sed -i '' 's|package tensorflow;|package tensorboard;|g' {} +

echo ""
echo "Protos in tensorboard/compat/proto/ updated! You can now add and commit them."
