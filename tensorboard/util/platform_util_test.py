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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard import test as tb_test
from tensorboard.util import platform_util


class PlatformUtilTest(tb_test.TestCase):

  def test_readahead_file_path(self):
    self.assertEqual('foo/bar', platform_util.readahead_file_path('foo/bar'))


if __name__ == '__main__':
  tb_test.main()
