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

import collections
import os
import subprocess
import unittest
import tempfile
from selenium.webdriver.common import by
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support import wait
from testing.web import webtest

from tensorboard.plugins.scalar import scalars_demo
from tensorboard.plugins.audio import audio_demo


_BASE_PORT = 8000
_PORT_OFFSETS = collections.defaultdict(lambda: len(_PORT_OFFSETS))


class BasicTest(unittest.TestCase):
  """Tests that the basic chrome is displayed when there is no data."""

  @classmethod
  def setUpClass(cls):
    src_dir = os.environ["TEST_SRCDIR"]
    binary = os.path.join(src_dir,
                          "org_tensorflow_tensorboard/tensorboard/tensorboard")
    cls.logdir = tempfile.mkdtemp(prefix='core_test_%s_logdir_' % cls.__name__)
    cls.setUpData()
    cls.port = _BASE_PORT + _PORT_OFFSETS[cls]
    cls.process = subprocess.Popen(
        [binary, "--port", str(cls.port), "--logdir", cls.logdir])

  @classmethod
  def setUpData(cls):
    # Overridden by DashboardsTest.
    pass

  @classmethod
  def tearDownClass(cls):
    cls.process.kill()
    cls.process.wait()

  def setUp(self):
    self.driver = webtest.new_webdriver_session()
    self.driver.get("http://localhost:%s" % self.port)
    self.wait = wait.WebDriverWait(self.driver, 10)

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

  def testLogdirDisplays(self):
    self.wait.until(
      expected_conditions.text_to_be_present_in_element((
        by.By.ID, "data_location"), self.logdir))

class DashboardsTest(BasicTest):
  """Tests basic behavior when there is some data in TensorBoard.

  This extends `BasicTest`, so it inherits its methods to test that the
  basic chrome is displayed. We also check that we can navigate around
  the various dashboards.
  """

  @classmethod
  def setUpData(cls):
    scalars_demo.run_all(cls.logdir, verbose=False)
    audio_demo.run_all(cls.logdir, verbose=False)

  def testLogdirDisplays(self):
    # TensorBoard doesn't have logdir display when there is data
    pass

  def testDashboardSelection(self):
    """Test that we can navigate among the different dashboards."""
    selectors = {
      "scalars_tab": "paper-tab[data-dashboard=scalars]",
      "audio_tab": "paper-tab[data-dashboard=audio]",
      "graphs_tab": "paper-tab[data-dashboard=graphs]",
      "inactive_dropdown": "paper-dropdown-menu[label*=Inactive]",
      "images_menu_item": "paper-item[data-dashboard=images]",
      "reload_button": "paper-icon-button#reload-button",
    }
    elements = {}
    for (name, selector) in selectors.items():
      locator = (by.By.CSS_SELECTOR, selector)
      self.wait.until(expected_conditions.presence_of_element_located(locator))
      elements[name] = self.driver.find_element_by_css_selector(selector)

    # The implementation of paper-* components doesn't seem to play nice
    # with Selenium's `element.is_selected()` and `element.is_enabled()`
    # methods. Instead, we check the appropriate WAI-ARIA attributes.
    # (Also, though the docs for `get_attribute` say that the string
    # `"false"` is returned as `False`, this appears to be the case
    # _sometimes_ but not _always_, so we should take special care to
    # handle that.)
    def is_selected(element):
      attribute = element.get_attribute("aria-selected")
      return attribute and attribute != "false"

    def is_enabled(element):
      attribute = element.get_attribute("aria-disabled")
      is_disabled = attribute and attribute != "false"
      return not is_disabled

    def assert_selected_dashboard(polymer_component_name):
      expected = {polymer_component_name}
      actual = {
        container.find_element_by_css_selector("*").tag_name  # first child
        for container
        in self.driver.find_elements_by_css_selector(".dashboard-container")
        if container.is_displayed()
      }
      self.assertEqual(expected, actual)

    # The scalar and audio dashboards should be active, and the scalar
    # dashboard should be selected by default. The images menu item
    # should not be visible, as it's within the drop-down menu.
    self.assertTrue(elements["scalars_tab"].is_displayed())
    self.assertTrue(elements["audio_tab"].is_displayed())
    self.assertTrue(elements["graphs_tab"].is_displayed())
    self.assertTrue(is_selected(elements["scalars_tab"]))
    self.assertFalse(is_selected(elements["audio_tab"]))
    self.assertFalse(elements["images_menu_item"].is_displayed())
    self.assertFalse(is_selected(elements["images_menu_item"]))
    assert_selected_dashboard("tf-scalar-dashboard")

    # While we're on the scalar dashboard, we should be allowed to
    # reload the data.
    self.assertTrue(is_enabled(elements["reload_button"]))

    # We should be able to activate the audio dashboard.
    elements["audio_tab"].click()
    self.assertFalse(is_selected(elements["scalars_tab"]))
    self.assertTrue(is_selected(elements["audio_tab"]))
    self.assertFalse(is_selected(elements["graphs_tab"]))
    self.assertFalse(is_selected(elements["images_menu_item"]))
    assert_selected_dashboard("tf-audio-dashboard")
    self.assertTrue(is_enabled(elements["reload_button"]))

    # We should then be able to open the dropdown and navigate to the
    # image dashboard. (We have to wait until it's visible because of the
    # dropdown menu's animations.)
    elements["inactive_dropdown"].click()
    self.wait.until(
      expected_conditions.visibility_of(elements["images_menu_item"]))
    self.assertTrue(elements["images_menu_item"].is_displayed())
    elements["images_menu_item"].click()
    self.assertFalse(is_selected(elements["scalars_tab"]))
    self.assertFalse(is_selected(elements["audio_tab"]))
    self.assertFalse(is_selected(elements["graphs_tab"]))
    self.assertTrue(is_selected(elements["images_menu_item"]))
    assert_selected_dashboard("tf-image-dashboard")
    self.assertTrue(is_enabled(elements["reload_button"]))

    # Next, we should be able to navigate back to an active dashboard.
    # If we choose the graphs dashboard, the reload feature should be
    # disabled.
    elements["graphs_tab"].click()
    self.assertFalse(elements["images_menu_item"].is_displayed())
    self.assertFalse(is_selected(elements["scalars_tab"]))
    self.assertFalse(is_selected(elements["audio_tab"]))
    self.assertTrue(is_selected(elements["graphs_tab"]))
    self.assertFalse(is_selected(elements["images_menu_item"]))
    assert_selected_dashboard("tf-graph-dashboard")
    self.assertFalse(is_enabled(elements["reload_button"]))

    # Finally, we should be able to navigate back to the scalar dashboard.
    elements["scalars_tab"].click()
    self.assertTrue(is_selected(elements["scalars_tab"]))
    self.assertFalse(is_selected(elements["audio_tab"]))
    self.assertFalse(is_selected(elements["graphs_tab"]))
    self.assertFalse(is_selected(elements["images_menu_item"]))
    assert_selected_dashboard("tf-scalar-dashboard")
    self.assertTrue(is_enabled(elements["reload_button"]))


if __name__ == "__main__":
  unittest.main()
