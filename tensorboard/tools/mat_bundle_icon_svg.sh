#!/bin/bash
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
# ==============================================================================

# Exposes input SVGs as definitions with filename, without extension, as the
# ids.
# Usage: mat_bundle_icon_svg.sh [output.svg] [in_1.svg] [in_2.svg] ...

OUTPUT_PATH=$1
shift

PREAMBLE='<svg><defs>'
POSTAMBLE='</defs></svg>'

{
    echo "${PREAMBLE}"
    for file in "$@"; do
      svg_id="$(basename $file | sed 's|\.svg$||g')"
      sed "s|<svg|<svg id=\"$svg_id\"|g" "$file"
    done
    echo "${POSTAMBLE}"
} > "${OUTPUT_PATH}"
