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

if ! [ -f WORKSPACE ]; then
    printf >&2 'fatal: no WORKSPACE file found (are you at TensorBoard root?)\n'
    exit 2
fi

# Exclude the .git directory, whose reflog entries can include the first
# lines of commit messages. Include all other non-binary files.
! grep -rI . --exclude-dir=.git \
    -e 'DO'' ''NOT'' ''SUBMIT' \
    -e 'DO''_''NOT''_''SUBMIT' \
    ;
