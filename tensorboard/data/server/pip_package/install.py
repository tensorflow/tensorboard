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
"""Build and install `tensorboard_data_server` into your virtualenv.

This bundles the `//tensorboard/data/server` binary built with Bazel.

To uninstall, just `pip uninstall tensorboard_data_server`.
"""

import os
import pathlib
import subprocess
import sys
import tempfile


def _shell(*args, **kwargs):
    kwargs.setdefault("check", True)
    return subprocess.run(*args, **kwargs)


def main():
    if not os.environ.get("VIRTUAL_ENV"):
        sys.stderr.write(
            "Not in a virtualenv. You probably don't want to do this.\n"
        )
        sys.exit(1)
    tmpdir = tempfile.TemporaryDirectory()

    thisdir = pathlib.Path(os.path.dirname(__file__))
    server_binary = thisdir / ".." / "server"
    build_script = thisdir / "build"

    try:
        result = _shell(
            [
                build_script,
                "--server-binary=%s" % (server_binary,),
                "--out-dir=%s" % (tmpdir.name,),
            ],
            capture_output=True,
        )
    except subprocess.CalledProcessError as e:
        sys.stdout.buffer.write(e.stdout)
        sys.stdout.flush()
        sys.stderr.buffer.write(e.stderr)
        sys.stderr.flush()
        raise

    lines = result.stdout.decode("utf-8").splitlines()
    if len(lines) != 1:
        raise RuntimeError("Expected one line of stdout; got: %r" % lines)
    wheel = lines[0]

    _shell(["pip", "uninstall", "-y", "tensorboard_data_server"])
    _shell(["pip", "install", "--", wheel])


if __name__ == "__main__":
    main()
