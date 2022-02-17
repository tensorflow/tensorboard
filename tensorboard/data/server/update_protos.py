# Copyright 2022 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Update proto source files based on generated outputs."""

import os
import sys

# Paths to "tensorboard/data/server/" in (a) the Bazel runfiles tree,
# whence we can read data dependencies, and (b) the Git repository,
# whither we can write output files.
_BAZEL_DIR = os.path.join("tensorboard", "data", "server")
_REPO_DIR = os.path.dirname(os.readlink(__file__))

# Basename for the gRPC file descriptor set. The same basename is used
# for the generated file and the source file.
_FILE_DESCRIPTOR_SET = "descriptor.bin"

_RUST_LICENSE = """\
/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

"""


def pkg_basename(pkg, rust_extension):
    if pkg == _FILE_DESCRIPTOR_SET:
        return _FILE_DESCRIPTOR_SET
    else:
        return "%s%s" % (pkg, rust_extension)


def expected_contents(pkg):
    src = os.path.join(_BAZEL_DIR, "genproto", pkg_basename(pkg, ".rs"))
    with open(src, "rb") as infile:
        contents = infile.read()
    if pkg != _FILE_DESCRIPTOR_SET:
        contents = _RUST_LICENSE.encode("utf-8") + contents
    return contents


def repo_file_path(pkg):
    return os.path.join(_REPO_DIR, pkg_basename(pkg, ".pb.rs"))


def runfiles_file_path(pkg):
    return os.path.join(_BAZEL_DIR, pkg_basename(pkg, ".pb.rs"))


def update(proto_packages):
    for pkg in proto_packages:
        with open(repo_file_path(pkg), "wb") as outfile:
            outfile.write(expected_contents(pkg))


def check(proto_packages):
    failed = False
    for pkg in proto_packages:
        dst = runfiles_file_path(pkg)
        try:
            expected = expected_contents(pkg)
            with open(dst, "rb") as infile:
                actual = infile.read()
        except OSError as e:
            failed = True
            print("Could not read package %s: %s" % (pkg, e))
            continue
        if expected == actual:
            print("%s OK" % dst)
        else:
            print("%s out of date" % dst)
            failed = True
    if failed:
        print("To update, run //tensorboard/data/server:update_protos")
        raise SystemExit(1)


def main():
    (mode, *proto_packages) = sys.argv[1:]
    if mode == "--update":
        return update(proto_packages)
    if mode == "--check":
        return check(proto_packages)
    raise ValueError("unknown mode: %r" % mode)


if __name__ == "__main__":
    main()
