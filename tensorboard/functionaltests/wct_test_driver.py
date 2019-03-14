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

"""WebDriver for running TypeScript and Polymer unit tests.

Figures out the result by scanning the browser log.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import re
import subprocess
import unittest
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support import wait
from testing.web import webtest


# As emitted in the "Listening on:" line of the WebfilesServer output.
# We extract only the port because the hostname can reroute through corp
# DNS and force auth, which fails in tests.
_URL_RE = re.compile(br'http://[^:]*:([0-9]+)/')
_SUITE_PASSED_RE = re.compile(r'.*test suite passed"$')
_SUITE_FAILED_RE = re.compile(r'.*failing test.*')

def create_test_class(binary_path, web_path):
  """Create a unittest.TestCase class to run WebComponentTester tests.

  Arguments:
    binary_path: relative path to a `tf_web_library` target;
        e.g.: "tensorboard/components/vz_foo/test/test_web_library"
    web_path: absolute web path to the tests page in the above web
        library; e.g.: "/vz-foo/test/tests.html"

  Result:
    A new subclass of `unittest.TestCase`. Bind this to a variable in
    the test file's main module.
  """

  class BrowserLogIndicatesResult(object):
    def __init__(self):
      self.passed = False
      self.log = []

    def __call__(self, driver):
      # Scan through the log entries and search for a line indicating whether
      # the test passed or failed. The method 'driver.get_log' also seems to
      # clear the log so we aggregate it in self.log for printing later on.
      new_log = driver.get_log("browser")
      new_messages = [entry["message"] for entry in new_log]
      self.log = self.log + new_log
      if self._log_matches(new_messages, _SUITE_FAILED_RE):
        self.passed = False
        return True
      if self._log_matches(new_messages, _SUITE_PASSED_RE):
        self.passed = True
        return True
      # Here, we still don't know.
      return False

    def _log_matches(self, messages, regexp):
      for message in messages:
        if regexp.match(message):
          return True
      return False

  class WebComponentTesterTest(unittest.TestCase):
    """Tests that a family of unit tests completes successfully."""

    def setUp(cls):
      src_dir = os.environ["TEST_SRCDIR"]
      binary = os.path.join(
          src_dir,
          "org_tensorflow_tensorboard/" + binary_path)
      cls.process = subprocess.Popen(
          [binary], stdin=None, stdout=None, stderr=subprocess.PIPE)

      lines = []
      hit_eof = False
      while True:
        line = cls.process.stderr.readline()
        if line == b"":
          # b"" means reached EOF; b"\n" means empty line.
          hit_eof = True
          break
        lines.append(line)
        if b"Listening on:" in line:
          match = _URL_RE.search(line)
          if match:
            cls.port = int(match.group(1))
            break
          else:
            raise ValueError("Failed to parse listening-on line: %r" % line)
        if len(lines) >= 1024:
          # Sanity check---something is wrong. Let us fail fast rather
          # than spending the 15-minute test timeout consuming
          # potentially empty logs.
          hit_eof = True
          break
      if hit_eof:
        full_output = "\n".join(repr(line) for line in lines)
        raise ValueError(
            "Did not find listening-on line in output:\n%s" % full_output)

    def tearDown(cls):
      cls.process.kill()
      cls.process.wait()

    def test(self):
      driver = webtest.new_webdriver_session(
          capabilities={"loggingPrefs": {"browser": "ALL"}}
      )
      url = "http://localhost:%s%s" % (self.port, web_path)
      driver.get(url)
      browser_log_indicates_result = BrowserLogIndicatesResult()
      try:
        wait.WebDriverWait(driver, 10).until(browser_log_indicates_result)
        if not browser_log_indicates_result.passed:
          self.fail()
      finally:
        # Print log as an aid for debugging.
        log = browser_log_indicates_result.log + driver.get_log("browser")
        self._print_log(log)

    def _print_log(self, entries):
      print("Browser log follows:")
      print("--------------------")
      print(" | ".join(entries[0].keys()))
      for entry in entries:
        print(" | ".join(str(v) for v in entry.values()))

  return WebComponentTesterTest
