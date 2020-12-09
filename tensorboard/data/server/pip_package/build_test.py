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
"""Tests for the `tensorboard_data_server` build script."""

import os
import subprocess
import sys

from tensorboard import test as tb_test


class BuildPipPackageTest(tb_test.TestCase):
    def test(self):
        server_bin = os.path.join(self.get_temp_dir(), "server")
        with open(server_bin, "wb"):
            pass
        os.chmod(server_bin, 0o755)
        outdir = os.path.join(self.get_temp_dir(), "out")
        os.mkdir(outdir)

        build_script = os.path.join(os.path.dirname(__file__), "build")
        try:
            result = subprocess.run(
                [
                    build_script,
                    "--server-binary=%s" % (server_bin,),
                    "--out-dir=%s" % (outdir,),
                ],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as e:
            sys.stdout.buffer.write(e.stdout)
            sys.stdout.flush()
            sys.stderr.buffer.write(e.stderr)
            sys.stderr.flush()
            raise

        lines = result.stdout.decode("utf-8").splitlines()
        self.assertLen(lines, 1)
        wheel = lines[0]
        self.assertEqual(os.path.dirname(wheel), outdir)
        self.assertTrue(os.path.isfile(wheel))
        os.unlink(wheel)
        os.rmdir(outdir)  # make sure no extraneous files were added


if __name__ == "__main__":
    tb_test.main()
