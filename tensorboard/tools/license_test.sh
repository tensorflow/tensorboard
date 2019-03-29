#!/usr/bin/env bash
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

# tf_imports/*.html define their respective OSS license.
# tensorboard/plugins/beholder/colormaps.py has a different license.
files=$(grep -rL "Copyright 20[0-9][0-9] The TensorFlow" \
    --include=*.* \
    --exclude=*.{pyc,json,png,wav,proto,pbtxt,md,in,rst,cfg,ipynb} \
    tensorboard | \
    grep -v "tensorboard/components/tf_imports/.*.html\|tensorboard/plugins/beholder/colormaps.py" )

count=$(echo "$files" | wc -l | awk '{print $1}')

if [[ ! -z $files && $count -gt 0 ]]; then
  echo "Requires license information in below file(s):"
  echo -e "$files"
  exit $count
fi
