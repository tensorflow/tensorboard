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

# Check that all TensorFlow build mirror URLs resolve, and that we're
# not using any legacy Bazel mirror URLs.
#
# This does not check that every URL in a build/workspace file is
# properly mirrored.
#
# This test requires an Internet connection.

set -eu

if ! [ -f WORKSPACE ]; then
    printf >&2 'fatal: no WORKSPACE file found (are you at TensorBoard root?)\n'
    exit 2
fi

tmpdir="$(mktemp -d)"
cleanup() {
    rm -r "${tmpdir}" || true
}
trap cleanup EXIT

check_urls_resolve() {
    # shellcheck disable=SC2016
    check_cmd='curl -sfL "$1" >/dev/null || printf "%s\n" "$1"'
    url_pcre='(?<=")https?://mirror\.tensorflow\.org/[^"]*'
    exclude_bazel=':!ci/download_bazel.sh'  # uses a '${version}' format string
    exclude_buildifier=':!ci/download_buildifier.sh'  # likewise
    exclude_buildozer=':!ci/download_buildozer.sh'  # likewise
    # We use `git-grep` to efficiently get an initial result set, then
    # filter it down with GNU `grep` separately, because `git-grep` only
    # learned `-o` in Git v2.19.
    unresolved_urls_file="${tmpdir}/unresolved_urls"
    git grep -Ph "${url_pcre}" "${exclude_bazel}" "${exclude_buildifier}" \
        "${exclude_buildozer}" \
        | grep -o 'https\?://mirror\.tensorflow\.org/[^"]*' \
        | sort -u \
        >"${unresolved_urls_file}"
    for try in 1 2 3; do
        if ! [ -s "${unresolved_urls_file}" ]; then
            break
        fi
        temp_urls_file="${tmpdir}/unresolved_urls.tmp"
        # NOTE: This use of `xargs -P` with a single output stream is
        # technically subject to race conditions involving interleaving
        # output. This is unlikely to occur in practice, and if it does
        # occur the exit status of this test will still be correct; only
        # the list of URLs may potentially be mangled.
        xargs -n 1 -P 32 -- sh -c "${check_cmd}" unused \
            <"${unresolved_urls_file}" >"${temp_urls_file}"
        mv "${temp_urls_file}" "${unresolved_urls_file}"
    done

    if ! [ -s "${unresolved_urls_file}" ]; then
        return 0
    fi

    printf '%s\n' 'The following URLs are not properly mirrored:'
    sed -e 's/^/  - /' "${unresolved_urls_file}"
    printf '%s\n' \
        'Please comment on your PR asking a TensorBoard core team member ' \
        'to mirror these URLs per instructions in http://b/133880558.' \
        '' \
        ;
    return 1
}

check_no_bazel_urls() {
    bazel_urls_file="${tmpdir}/bazel_urls"
    git grep -Hn 'https\?://mirror\.bazel\.build' \
        | sort \
        >"${bazel_urls_file}"
    if ! [ -s "${bazel_urls_file}" ]; then
        return 0
    fi
    printf '%s\n' 'The following URLs point to the legacy Bazel mirror:'
    cat "${bazel_urls_file}"
    printf '%s\n' \
        'Please update them to use http://mirror.tensorflow.org/ instead.' \
        '' \
        ;
    return 1
}

main() {
    failed=0
    check_urls_resolve || failed=1
    check_no_bazel_urls || failed=1
    return "${failed}"
}

main "$@"
