# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for tensorboard.defs.resource_digest_suffixer."""

import os

from tensorboard import test as tb_test
from tensorboard.defs.internal import resource_digest_suffixer

_EXPECTED_QUERY_FOR_MY_CONTENT = "_file_hash=1d079033"


class ResourceDigestSuffixerTest(tb_test.TestCase):
    def create_file(self, file_basename, template):
        temp_dir = self.get_temp_dir()
        full_path = os.path.join(temp_dir, file_basename)
        with open(full_path, "w") as f:
            f.write(template)

        return full_path

    def test_replacement(self):
        template_path = self.create_file("template", "hello%REPLACE_ME%world")
        res_path = self.create_file("res", "my_content")

        actual = resource_digest_suffixer.replace_files(
            template_path, {"%REPLACE_ME%": res_path}
        )

        self.assertEqual(
            "hellores?%sworld" % _EXPECTED_QUERY_FOR_MY_CONTENT, actual
        )

    def test_replacement_multiple(self):
        template_path = self.create_file(
            "new_template", "%FILE_1% and %FILE_1% and %FILE_2%"
        )
        res_path = self.create_file("res", "my_content")
        res2_path = self.create_file("res2", "my_content")

        actual = resource_digest_suffixer.replace_files(
            template_path,
            {
                "%FILE_1%": res_path,
                "%FILE_2%": res2_path,
            },
        )

        self.assertEqual(
            "res?{0} and res?{0} and res2?{0}".format(
                _EXPECTED_QUERY_FOR_MY_CONTENT
            ),
            actual,
        )

    def test_missing_template_handlebar(self):
        template_path = self.create_file(
            "new_template", "nothing_below_matches_me"
        )
        res_path = self.create_file("res", "my_content")

        actual = resource_digest_suffixer.replace_files(
            template_path, {"%REPLACE_ME%": res_path}
        )

        self.assertEqual("nothing_below_matches_me", actual)

    def test_collision(self):
        template_path = self.create_file("template", "sub_substring")
        res_path = self.create_file("res", "my_content")

        actual = resource_digest_suffixer.replace_files(
            template_path, {"sub": res_path}
        )

        self.assertEqual(
            "res?{0}_res?{0}string".format(_EXPECTED_QUERY_FOR_MY_CONTENT),
            actual,
        )

    def test_missing_template(self):
        res_path = self.create_file("res", "my_content")

        with self.assertRaises(FileNotFoundError):
            resource_digest_suffixer.replace_files("dne", {"sub": res_path})

    def test_missing_resource(self):
        template_path = self.create_file("template", "hello")

        with self.assertRaises(FileNotFoundError):
            resource_digest_suffixer.replace_files(
                template_path, {"sub": "dne"}
            )


if __name__ == "__main__":
    tb_test.main()
