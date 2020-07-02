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

set -eu

# Replaces %*.png% in the input .html file with a data URI containing the
# image content of the corresopnding .png files in the images/ subdirectory.

mime_type='image/png'

tmp_file="$(mktemp)"
cp "$@" "${tmp_file}"

for image_file in $0.runfiles/org_tensorflow_tensorboard/tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive/images/*.png; do
  base64_contents="$(base64 "${image_file}" | tr -d '\n')"
  data_uri="data:${mime_type};base64,${base64_contents}"

  image_basename="$(basename ${image_file})"

  awk -i inplace \
      -v image_basename="%${image_basename}%" -v data_uri="${data_uri}" \
      '{ gsub(image_basename, data_uri); print }' \
      "${tmp_file}"
done

cat "${tmp_file}"
rm "${tmp_file}"