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
from selenium.webdriver.common import by
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support import wait
from testing.web import webtest


class BasicTest(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    src_dir = os.environ["TEST_SRCDIR"]
    binary = os.path.join(src_dir,
                          "org_tensorflow_tensorboard/tensorboard/tensorboard")
    log_dir = "/tmp/hypothetical_log_directory"
    cls.process = subprocess.Popen(
        [binary, "--port", "8000", "--logdir", log_dir])

  @classmethod
  def tearDownClass(cls):
    cls.process.kill()
    cls.process.wait()

  def setUp(self):
    self.driver = webtest.new_webdriver_session()
    self.driver.get("http://localhost:8000")
    self.wait = wait.WebDriverWait(self.driver, 2)

  def tearDown(self):
    try:
      self.driver.quit()
    finally:
      self.driver = None
      self.wait = None

  def testToolbarTitleDisplays(self):
    self.wait.until(
        expected_conditions.text_to_be_present_in_element((
            by.By.CLASS_NAME, "toolbar-title"), "TensorBoard"))


if __name__ == "__main__":
  unittest.main()
