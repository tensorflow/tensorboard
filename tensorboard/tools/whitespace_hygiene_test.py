#!/usr/bin/python3
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

"""Check for superfluous whitespace at ends of lines.

Keeps diffs clean and persnickety developers happy.
"""

import dataclasses
import os
import subprocess
import sys


exceptions = frozenset([])


@dataclasses.dataclass(frozen=True)
class Match:
    """Information of the match for superfluous trailing whitespaces.

    Attributes:
      filename: Name of file containing the match.
      line_number: Line number of the match.
      line: Content of the line containing the match.
    """

    filename: str
    line_number: int
    line: str


def main():
    chdir_to_repo_root()
    matches = git_grep("  *$")
    errors = [m for m in matches if m.filename not in exceptions]
    okay = True

    if errors:
        print("Superfluous trailing whitespace:")
        for error in errors:
            print("%s:%d:%s$" % (error.filename, error.line_number, error.line))
        print()
        okay = False

    stale_exceptions = exceptions - frozenset(m.filename for m in matches)
    if stale_exceptions:
        print(
            "Stale exceptions (no whitespace problems; prune exceptions list):"
        )
        for filename in stale_exceptions:
            print(filename)
        print()
        okay = False

    sys.exit(0 if okay else 1)


def git_grep(pattern):
    """Run `git grep` and collect matches.

    This function exits the process if `git grep` writes any stderr: for
    instance, if the provided pattern is an invalid regular expression.

    Args:
      pattern: `str`; a pattern argument to `git grep`.

    Returns:
      A list of `Match` values.
    """
    cmd = ["git", "grep", "-Izn", "--", pattern]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    (stdout, stderr) = p.communicate()
    if stderr:
        getattr(sys.stderr, "buffer", sys.stderr).write(
            stderr
        )  # Python 2 compat
        sys.exit(1)
    result = []
    for (
        line
    ) in stdout.splitlines():  # assumes no newline characters in filenames
        (filename_raw, line_number_raw, line_raw) = line.split(b"\0", 2)
        match = Match(
            filename=filename_raw.decode("utf-8", errors="replace"),
            line_number=int(line_number_raw),
            line=line_raw.decode("utf-8", errors="replace"),
        )
        result.append(match)
    return result


def chdir_to_repo_root():
    toplevel = subprocess.check_output(["git", "rev-parse", "--show-toplevel"])
    toplevel = toplevel[:-1]  # trim trailing LF
    os.chdir(toplevel)


if __name__ == "__main__":
    main()
