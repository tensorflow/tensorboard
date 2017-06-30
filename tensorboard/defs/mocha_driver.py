# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

"""Basic TensorBoard functional tests using WebDriver."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import re
import StringIO
import subprocess
import unittest
from selenium import webdriver

from selenium.webdriver.common import desired_capabilities
from testing.web import webtest

import time
import sys

ONE_SECOND = 1
SECONDS_TO_TIMEOUT = 10

class MochaTest(unittest.TestCase):
  """Driver for the mocha_test declared in //tensorboard/defs/mocha_test.bzl.

  It expects that the runfiles for this test include a _mocha_devserver
  which is an executable. When run this executable prints console output
  including "Listening on: [host]:[port]/", and that executable serves
  "/index.html" which is a mocha test suite.

  It runs that test suite using webdriver, and inspects the web console output
  to see if the tests passed.
  """

  def setUp(self):
    src_dir = os.environ["TEST_SRCDIR"]

    for root, _, files in os.walk(src_dir):
      for file in files:
        if file.endswith("_mocha_devserver"):
          # We found the mocha test devserver binary to run
          binary = os.path.join(root, file)
          break

    self.process = subprocess.Popen([binary])
    d = desired_capabilities.DesiredCapabilities.CHROME
    d['loggingPrefs'] = { 'browser':'ALL' }

    self.driver = webtest.new_webdriver_session(capabilities=d)
    self.driver.get("http://localhost:6006/index.html")

  def tearDown(self):
    self.driver.quit()
    self.process.kill()
    self.process.wait()

  def testMochaUnitTests(self):
    """Peridoically check console output to find when tests pass or fail.

    The test fails if it prints a line to console indicating saying that
    it has some failing tests. It passes if it prints a line saying that
    the test suite passed. It times out if the strings aren't found after
    several subsequent calls to console.

    Note that the get_log call seems to block on synchronous JS execution,
    so this test will stall if the browser gets stuck in a loop. However,
    it will fail with a timeout if the tests never finish but do allow
    the console request through.
    """

    fail_regex = 'http://.*/browser.js \d+:\d+ "%c\d+ failing tests?"'
    pass_regex = 'http://.*/browser.js \d+:\d+ "%ctest suite passed"'
    messages = []
    for _ in range(SECONDS_TO_TIMEOUT):
      entries = self.driver.get_log('browser')
      messages += [e[u'message'] for e in entries
                  if e[u'source'] == u'console-api']
      messages_joined = '\n'.join(messages)
      for message in messages:
        if re.match(fail_regex, message):
          self.fail(messages_joined)
        if re.match(pass_regex, message):
          return
      time.sleep(ONE_SECOND)
    self.fail('Test timeout after %ds. Last messages:\n%s' %
              (SECONDS_TO_TIMEOUT, messages_joined))


if __name__ == "__main__":
  unittest.main()
