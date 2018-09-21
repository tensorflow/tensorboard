#!/bin/bash

set -e

# To find other protos you need run something like
#
#     find ../tensorflow/ -type f  -name 'event.proto'
#

# Copy all protos temporarily
cp ../tensorflow/tensorflow/core/framework/*.proto tensorboard/proto/
cp ../tensorflow/tensorflow/core/protobuf/*.proto tensorboard/proto/
cp ../tensorflow/tensorflow/core/util/*.proto tensorboard/proto/
cp ../tensorflow/tensorflow/python/framework/*.proto tensorboard/proto/

# Only keep those that update
# TODO: Might want to do this more selectively
git clean -fdx

# Replace paths internally
find tensorboard/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/framework|tensorboard/proto|g' {} +
find tensorboard/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/protobuf|tensorboard/proto|g' {} +
find tensorboard/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/python/framework|tensorboard/proto|g' {} +
find tensorboard/proto/ -type f  -name '*.proto' -exec sed -i '' 's|tensorflow/core/util|tensorboard/proto|g' {} +
find tensorboard/proto/ -type f  -name '*.proto' -exec sed -i '' 's|package tensorflow;|package tensorboard;|g' {} +

echo ""
echo "Protos in tensorboard/proto/ updated! You can now add and commit them."
