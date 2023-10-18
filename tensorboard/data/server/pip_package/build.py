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
"""Build script for the `tensorboard_data_server` Pip package.

You are expected to bring a pre-built copy of the actual underlying data
server binary and pass it as an argument to this script. In return, this
script will generate a wheel and print its path to stdout.
"""

# Only standard library dependencies, to make this easy to run without Bazel.
import argparse
import glob
import os
import pathlib
import platform
import shutil
import subprocess
import sys
import tempfile


def main():
    cpu_name = platform.machine()
    mac_platform = "macosx_10_9"
    if cpu_name == "arm64":
        mac_platform = "macosx_11_0"
    platform_name = {
        # We build on an Ubuntu 20.04 (Focal Fossa) image, which ships with
        # glibc 2.31 (https://launchpad.net/ubuntu/focal/+source/glibc).
        "Linux": "manylinux_2_31",
        "Darwin": mac_platform,
    }.get(platform.system())

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out-dir",
        help="Output directory into which to place the wheel; should already exist",
        required=True,
    )
    parser.add_argument(
        "--platform",
        default=platform_name,
        help="Platform to build a wheel for",
    )
    parser.add_argument(
        "--cpu",
        default=cpu_name,
        help="CPU to build a wheel for",
    )
    binary_group = parser.add_mutually_exclusive_group(required=True)
    binary_group.add_argument(
        "--server-binary",
        help="Path to the //tensorboard/data/server binary to bundle into the package",
    )
    binary_group.add_argument(
        "--universal",
        help="Build a universal package with no server",
        action="store_true",
    )
    args = parser.parse_args()

    server_binary = None
    if not args.universal:
        server_binary = os.path.abspath(args.server_binary)
        if not os.path.isfile(server_binary):
            raise RuntimeError("No such file: %s" % server_binary)

    TDS = "tensorboard_data_server"  # convenience

    # Set up build tree.
    srcdir = pathlib.Path(os.path.dirname(__file__))
    tmpdir = pathlib.Path(tempfile.mkdtemp(prefix="%s_build_" % TDS))
    sys.stderr.write("tmpdir: %s\n" % tmpdir)
    os.makedirs(tmpdir / TDS / "bin", exist_ok=True)
    shutil.copyfile(srcdir / "setup.py", tmpdir / "setup.py")
    shutil.copyfile(srcdir / TDS / "__init__.py", tmpdir / TDS / "__init__.py")
    if server_binary is not None:
        shutil.copyfile(server_binary, tmpdir / TDS / "bin" / "server")
        os.chmod(tmpdir / TDS / "bin" / "server", 0o700)

    if args.universal:
        platform_tag = "any"
    else:
        if args.platform is None:
            raise RuntimeError(
                "Unsupported platform: %r" % (platform.system(),)
            )
        platform_tag = "%s_%s" % (args.platform, args.cpu)

    os.chdir(tmpdir)
    subprocess.run(
        [sys.executable, "setup.py", "bdist_wheel", "-p", platform_tag],
        stdout=sys.stderr,
        check=True,
    )

    wheels = glob.glob(os.path.join(os.getcwd(), "dist", "*.whl"))
    if len(wheels) != 1:
        raise ValueError("Expected one output wheel; got: %r" % (wheels,))
    wheel = wheels[0]
    outwheel = os.path.join(args.out_dir, os.path.basename(wheel))
    shutil.copyfile(wheel, outwheel)
    shutil.rmtree(tmpdir)

    print(outwheel)


if __name__ == "__main__":
    main()
