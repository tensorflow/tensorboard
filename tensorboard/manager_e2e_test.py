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
"""End-to-end tests for `tensorboard.manager`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import contextlib
import datetime
import errno
import json
import os
import pipes
import signal
import shutil
import subprocess
import tempfile
import textwrap

import six
from six.moves import urllib
import tensorflow as tf

try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

from tensorboard import manager


class ManagerEndToEndTest(tf.test.TestCase):

  def setUp(self):
    super(ManagerEndToEndTest, self).setUp()

    # Spy on subprocesses spawned so that we can kill them.
    self.popens = []
    class PopenSpy(subprocess.Popen):
      def __init__(p, *args, **kwargs):
        super(PopenSpy, p).__init__(*args, **kwargs)
        self.popens.append(p)
    popen_patcher = mock.patch.object(subprocess, "Popen", PopenSpy)
    popen_patcher.start()

    # Make sure that temporary files (including .tensorboard-info) are
    # created under our purview.
    self.tmproot = os.path.join(self.get_temp_dir(), "tmproot")
    os.mkdir(self.tmproot)
    tmpdir_environ = {"TMPDIR": self.tmproot}
    tmpdir_environ_patcher = mock.patch.dict(os.environ, tmpdir_environ)
    tmpdir_environ_patcher.start()
    self.addCleanup(tmpdir_environ_patcher.stop)
    tempfile.tempdir = None  # force `gettempdir` to reinitialize from env
    self.assertEqual(tempfile.gettempdir(), self.tmproot)
    self.info_dir = manager._get_info_dir()  # ensure that directory exists

    # Add our Bazel-provided `tensorboard` to the system path. (The
    # //tensorboard:tensorboard target is made available in the same
    # directory as //tensorboard:manager_e2e_test.)
    tensorboard_binary_dir = os.path.dirname(os.environ["TEST_BINARY"])
    path_environ = {
        "PATH": os.pathsep.join((tensorboard_binary_dir, os.environ["PATH"])),
    }
    path_environ_patcher = mock.patch.dict(os.environ, path_environ)
    path_environ_patcher.start()
    self.addCleanup(path_environ_patcher.stop)
    self._ensure_tensorboard_on_path(tensorboard_binary_dir)

  def tearDown(self):
    failed_kills = []
    for p in self.popens:
      try:
        p.kill()
      except Exception as e:
        if isinstance(e, OSError) and e.errno == errno.ESRCH:
          # ESRCH 3 No such process: e.g., it already exited.
          pass
        else:
          # We really want to make sure to try to kill all these
          # processes. Continue killing; fail the test later.
          failed_kills.append(e)
    for p in self.popens:
      p.wait()
    self.assertEqual(failed_kills, [])

  def _ensure_tensorboard_on_path(self, expected_binary_dir):
    """Ensure that `tensorboard(1)` refers to our own binary.

    Raises:
      subprocess.CalledProcessError: If there is no `tensorboard` on the
        path.
      AssertionError: If the `tensorboard` on the path is not under the
        provided directory.
    """
    # In Python 3.3+, we could use `shutil.which` to inspect the path.
    # For Python 2 compatibility, we shell out to the host platform's
    # standard utility.
    command = "where" if os.name == "nt" else "which"
    binary = subprocess.check_output([command, "tensorboard"])
    self.assertTrue(
        binary.startswith(expected_binary_dir.encode("utf-8")),
        "expected %r to start with %r" % (binary, expected_binary_dir),
    )

  def _stub_tensorboard(self, name, program):
    """Install a stub version of TensorBoard.

    Args:
      name: A short description of the stub's behavior. This will appear
        in the file path, which may appear in error messages.
      program: The contents of the stub: this should probably be a
        string that starts with "#!/bin/sh" and then contains a POSIX
        shell script.
    """
    tempdir = tempfile.mkdtemp(prefix="tensorboard-stub-%s-" % name)
    # (this directory is under our test directory; no need to clean it up)
    filepath = os.path.join(tempdir, "tensorboard")
    with open(filepath, "w") as outfile:
      outfile.write(program)
    os.chmod(filepath, 0o777)
    environ = {
        "PATH": os.pathsep.join((tempdir, os.environ["PATH"])),
    }
    environ_patcher = mock.patch.dict(os.environ, environ)
    environ_patcher.start()
    self.addCleanup(environ_patcher.stop)
    self._ensure_tensorboard_on_path(expected_binary_dir=tempdir)

  def _assert_live(self, info, expected_logdir):
    url = "http://localhost:%d%s/data/logdir" % (info.port, info.path_prefix)
    with contextlib.closing(urllib.request.urlopen(url)) as infile:
      data = infile.read()
    self.assertEqual(json.loads(data), {"logdir": expected_logdir})

  def test_simple_start(self):
    start_result = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(start_result, manager.StartLaunched)
    self._assert_live(start_result.info, expected_logdir="./logs")

  def test_reuse(self):
    r1 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r1, manager.StartLaunched)
    r2 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r2, manager.StartReused)
    self.assertEqual(r1.info, r2.info)
    infos = manager.get_all()
    self.assertEqual(infos, [r1.info])
    self._assert_live(r1.info, expected_logdir="./logs")

  def test_launch_new_because_incompatible(self):
    r1 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r1, manager.StartLaunched)
    r2 = manager.start(["--logdir=./adders", "--port=0"])
    self.assertIsInstance(r2, manager.StartLaunched)
    self.assertNotEqual(r1.info.port, r2.info.port)
    self.assertNotEqual(r1.info.pid, r2.info.pid)
    infos = manager.get_all()
    self.assertItemsEqual(infos, [r1.info, r2.info])
    self._assert_live(r1.info, expected_logdir="./logs")
    self._assert_live(r2.info, expected_logdir="./adders")

  def test_launch_new_because_info_file_deleted(self):
    r1 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r1, manager.StartLaunched)

    # Now suppose that someone comes and wipes /tmp/...
    self.assertEqual(len(manager.get_all()), 1, manager.get_all())
    shutil.rmtree(self.tmproot)
    os.mkdir(self.tmproot)
    self.assertEqual(len(manager.get_all()), 0, manager.get_all())

    # ...so that starting even the same command forces a relaunch:
    r2 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r2, manager.StartLaunched)  # (picked a new port)
    self.assertEqual(r1.info.cache_key, r2.info.cache_key)
    infos = manager.get_all()
    self.assertItemsEqual(infos, [r2.info])
    self._assert_live(r1.info, expected_logdir="./logs")
    self._assert_live(r2.info, expected_logdir="./logs")

  def test_reuse_after_kill(self):
    if os.name == "nt":
      self.skipTest("Can't send SIGTERM or SIGINT on Windows.")
    r1 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r1, manager.StartLaunched)
    os.kill(r1.info.pid, signal.SIGTERM)
    os.waitpid(r1.info.pid, 0)
    r2 = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(r2, manager.StartLaunched)
    self.assertEqual(r1.info.cache_key, r2.info.cache_key)
    # It's not technically guaranteed by POSIX that the following holds,
    # but it will unless the OS preemptively recycles PIDs or we somehow
    # cycled exactly through the whole PID space. Neither Linux nor
    # macOS recycles PIDs, so we should be fine.
    self.assertNotEqual(r1.info.pid, r2.info.pid)
    self._assert_live(r2.info, expected_logdir="./logs")

  def test_exit_failure(self):
    if os.name == "nt":
      # TODO(@wchargin): This could in principle work on Windows.
      self.skipTest("Requires a POSIX shell for the stub script.")
    self._stub_tensorboard(
        name="fail-with-77",
        program=textwrap.dedent(
            r"""
            #!/bin/sh
            printf >&2 'fatal: something bad happened\n'
            printf 'also some stdout\n'
            exit 77
            """.lstrip(),
        ),
    )
    start_result = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(start_result, manager.StartFailed)
    self.assertEqual(
        start_result,
        manager.StartFailed(
            exit_code=77,
            stderr="fatal: something bad happened\n",
            stdout="also some stdout\n",
        ),
    )
    self.assertEqual(manager.get_all(), [])

  def test_exit_success(self):
    # TensorBoard exiting with success but not writing the info file is
    # still a failure to launch.
    if os.name == "nt":
      # TODO(@wchargin): This could in principle work on Windows.
      self.skipTest("Requires a POSIX shell for the stub script.")
    self._stub_tensorboard(
        name="fail-with-0",
        program=textwrap.dedent(
            r"""
            #!/bin/sh
            printf >&2 'info: something good happened\n'
            printf 'also some standard output\n'
            exit 0
            """.lstrip(),
        ),
    )
    start_result = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(start_result, manager.StartFailed)
    self.assertEqual(
        start_result,
        manager.StartFailed(
            exit_code=0,
            stderr="info: something good happened\n",
            stdout="also some standard output\n",
        ),
    )
    self.assertEqual(manager.get_all(), [])

  def test_failure_unreadable_stdio(self):
    if os.name == "nt":
      # TODO(@wchargin): This could in principle work on Windows.
      self.skipTest("Requires a POSIX shell for the stub script.")
    self._stub_tensorboard(
        name="fail-and-nuke-tmp",
        program=textwrap.dedent(
            r"""
            #!/bin/sh
            rm -r %s
            exit 22
            """.lstrip() % pipes.quote(self.tmproot),
        ),
    )
    start_result = manager.start(["--logdir=./logs", "--port=0"])
    self.assertIsInstance(start_result, manager.StartFailed)
    self.assertEqual(
        start_result,
        manager.StartFailed(
            exit_code=22,
            stderr=None,
            stdout=None,
        ),
    )
    self.assertEqual(manager.get_all(), [])

  def test_timeout(self):
    if os.name == "nt":
      # TODO(@wchargin): This could in principle work on Windows.
      self.skipTest("Requires a POSIX shell for the stub script.")
    tempdir = tempfile.mkdtemp()
    pid_file = os.path.join(tempdir, "pidfile")
    self._stub_tensorboard(
        name="wait-a-minute",
        program=textwrap.dedent(
            r"""
            #!/bin/sh
            printf >%s '%%s' "$$"
            printf >&2 'warn: I am tired\n'
            sleep 60
            """.lstrip() % pipes.quote(os.path.realpath(pid_file)),
        ),
    )
    start_result = manager.start(
        ["--logdir=./logs", "--port=0"],
        timeout=datetime.timedelta(seconds=1),
    )
    self.assertIsInstance(start_result, manager.StartTimedOut)
    with open(pid_file) as infile:
      expected_pid = int(infile.read())
    self.assertEqual(start_result, manager.StartTimedOut(pid=expected_pid))
    self.assertEqual(manager.get_all(), [])


if __name__ == "__main__":
  tf.test.main()
