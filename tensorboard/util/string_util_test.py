# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard import test as tb_test
from tensorboard.util import string_util


class StringUtilTest(tb_test.TestCase):
    def test_sanitize_for_filename(self):
        def check(value, expected):
            self.assertEqual(string_util.sanitize_for_filename(value), expected)

        check("", "")
        check("foo", "foo")
        check("sub/dir", "sub_dir")
        check("/rootdir", "_rootdir")
        check("bad.exe", "bad_exe")
        check(
            "punct!#$%&'()*+,-./:;<=>?@[\]^_`{|}~\"uation",
            "punct__________,-_____=______________uation",
        )
        check("w h\ti\nt\re\x0bs\x0cpace", "whitespace")
        check("uñicode", "uicode")
        check("emo\U0001F95Dji", "emoji")


if __name__ == "__main__":
    tb_test.main()
