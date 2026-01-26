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


from packaging.version import parse as parse_version

from tensorboard import test as tb_test
from tensorboard import version


class VersionTest(tb_test.TestCase):
    def test_valid_pep440_version(self):
        """Ensure that our version is PEP 440-compliant."""
        compliant_version = parse_version("1.0.0")
        try:
            legacy_version = parse_version("arbitrary string")
        except Exception:
            legacy_version = None
        self.assertNotEqual(type(compliant_version), type(legacy_version))

        tensorboard_version = parse_version(version.VERSION)
        self.assertIsInstance(tensorboard_version, type(compliant_version))


if __name__ == "__main__":
    tb_test.main()
