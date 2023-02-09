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


import pkg_resources

from tensorboard import test as tb_test
from tensorboard import version


class VersionTest(tb_test.TestCase):
    def test_valid_pep440_version(self):
        """Ensure that our version is PEP 440-compliant."""
        # pkg_resources.parse_version() doesn't have a public return type,
        # so we get a handle to it by parsing known good and bad versions.
        #
        # Note: depending on the version of the module (which is bundled
        # with setuptools), when called with a non-compliant version, it
        # either returns a `LegacyVersion` (setuptools < 66) or raises an
        # `InvalidVersion` exception (setuptools >= 66). Handle both cases.
        compliant_version = pkg_resources.parse_version("1.0.0")
        try:
            legacy_version = pkg_resources.parse_version("arbitrary string")
        except Exception:
            legacy_version = None
        self.assertNotEqual(type(compliant_version), type(legacy_version))

        tensorboard_version = pkg_resources.parse_version(version.VERSION)
        self.assertIsInstance(tensorboard_version, type(compliant_version))


if __name__ == "__main__":
    tb_test.main()
