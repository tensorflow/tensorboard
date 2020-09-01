#!/bin/sh
# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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

# Remove comments from BUILD licenses(), and check that none existed. Note that
# this assumes `buildozer` is available, and it may modify files.

set -e

cleanup() {
  if [ $? = 3 ]; then
    exit 0
  else
    exit 1
  fi
}
trap cleanup EXIT

buildozer '//tensorboard/...:%licenses' remove_comment
cleanup
