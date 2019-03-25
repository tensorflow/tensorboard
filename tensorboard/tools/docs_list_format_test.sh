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
# ==============================================================================

# Check that any Markdown lists in IPython notebooks are preceded by a
# blank line, which is required for the Google-internal docs processor
# to interpret them as lists.

set -e

if ! [ -f WORKSPACE ]; then
    printf >&2 'fatal: no WORKSPACE file found (are you at TensorBoard root?)\n'
    exit 2
fi

git ls-files -z '*.ipynb' |
xargs -0 awk '
    { is_list = /"([-*]|[0-9]+\.) / }
    is_list && !last_list && !last_blank {
        printf "%s:%s:%s\n", FILENAME, FNR, $0;
        status = 1;
    }
    { last_blank = /"\\n",/; last_list = is_list }
    END { exit status }
' 
