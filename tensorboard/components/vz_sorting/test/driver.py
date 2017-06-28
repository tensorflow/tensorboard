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
import subprocess
import unittest
from selenium import webdriver

from selenium.webdriver.common import by
from selenium.webdriver.common import desired_capabilities
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support import wait
from testing.web import webtest

from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
# enable browser logging

import time


class BasicTest(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    src_dir = os.environ["TEST_SRCDIR"]
    binary = os.path.join(src_dir,
                          "org_tensorflow_tensorboard/tensorboard/components/vz_sorting/test/devserver")
    log_dir = "/tmp/hypothetical_log_directory"
    cls.process = subprocess.Popen(
        [binary])

  @classmethod
  def tearDownClass(cls):
    cls.process.kill()
    cls.process.wait()

  def setUp(self):
    d = desired_capabilities.DesiredCapabilities.CHROME
    d['loggingPrefs'] = { 'browser': 'ALL'}
    d = DesiredCapabilities.CHROME

    self.driver = webtest.new_webdriver_session(capabilities=d)#webdriver.Chrome(desired_capabilities=d)
    self.driver.get("http://localhost:6006/vz-sorting/test/tests.html")
    self.wait = wait.WebDriverWait(self.driver, 2)

  def tearDown(self):
    try:
      self.driver.quit()
    finally:
      self.driver = None
      self.wait = None


  def sillyFail(self):
    return 1

  def testTestsPass(self):

    while True:
      for entry in self.driver.get_log('browser'):
        print (entry)
        if 'failing test' in entry['message']:
          print('FAIL')
          return 1
        if 'Evaluated' in entry['message']:
          print('PASS')
          return 0
      time.sleep(0.25)




if __name__ == "__main__":
  unittest.main()
