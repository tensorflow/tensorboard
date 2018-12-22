#!/bin/sh
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

# Check that the capitalized strings "do not submit" and "do_not_submit"
# do not appear in any code files.

set -e

# Traverse up to the root of the repository. (The directory structure is
# slightly different in open-source vs. Google-internal, so we can't use
# a fixed offset.)
cd "$(dirname "$0")"
while true; do
    if [ -f LICENSE ]; then
        break
    fi
    if [ "$(readlink -f .)" = "$(readlink -f ..)" ]; then
        printf >&2 'fatal: cannot find TensorBoard repository root\n'
        printf >&2 'fatal: (is there no longer a LICENSE file?)\n'
        exit 2
    fi
    cd ../
done

! grep -rI -e 'DO NOT'' ''SUBMIT' -e 'DO_NOT''_''SUBMIT' tensorboard
