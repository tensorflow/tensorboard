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
"""Tests for `tensorboard.plugins.base_plugin`."""


from tensorboard import test as tb_test
from tensorboard.plugins import base_plugin


class FrontendMetadataTest(tb_test.TestCase):
    def _create_metadata(self):
        return base_plugin.FrontendMetadata(
            disable_reload="my disable_reload",
            element_name="my element_name",
            es_module_path="my es_module_path",
            remove_dom="my remove_dom",
            tab_name="my tab_name",
        )

    def test_basics(self):
        md = self._create_metadata()
        self.assertEqual(md.disable_reload, "my disable_reload")
        self.assertEqual(md.element_name, "my element_name")
        self.assertEqual(md.es_module_path, "my es_module_path")
        self.assertEqual(md.remove_dom, "my remove_dom")
        self.assertEqual(md.tab_name, "my tab_name")

    def test_repr(self):
        repr_ = repr(self._create_metadata())
        self.assertIn(repr("my disable_reload"), repr_)
        self.assertIn(repr("my element_name"), repr_)
        self.assertIn(repr("my es_module_path"), repr_)
        self.assertIn(repr("my remove_dom"), repr_)
        self.assertIn(repr("my tab_name"), repr_)

    def test_eq(self):
        md1 = base_plugin.FrontendMetadata(element_name="foo")
        md2 = base_plugin.FrontendMetadata(element_name="foo")
        md3 = base_plugin.FrontendMetadata(element_name="bar")
        self.assertEqual(md1, md2)
        self.assertNotEqual(md1, md3)
        self.assertNotEqual(md1, "hmm")

    def test_hash(self):
        md1 = base_plugin.FrontendMetadata(element_name="foo")
        md2 = base_plugin.FrontendMetadata(element_name="foo")
        md3 = base_plugin.FrontendMetadata(element_name="bar")
        self.assertEqual(hash(md1), hash(md2))
        # The next check is technically not required by the `__hash__`
        # contract, but _should_ pass; failure on this assertion would at
        # least warrant some scrutiny.
        self.assertNotEqual(hash(md1), hash(md3))


if __name__ == "__main__":
    tb_test.main()
