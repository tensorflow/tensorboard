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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from six import moves
import sys
import unittest


class ReloadTensorBoardTest(unittest.TestCase):

  def test_functional_after_reload(self):
    self.assertNotIn("tensorboard", sys.modules)
    import tensorboard as tensorboard  # it makes the Google sync happy
    submodules = ["notebook", "program", "summary"]
    dirs_before = {
        module_name: dir(getattr(tensorboard, module_name))
        for module_name in submodules
    }
    tensorboard = moves.reload_module(tensorboard)
    dirs_after = {
        module_name: dir(getattr(tensorboard, module_name))
        for module_name in submodules
    }
    self.assertEqual(dirs_before, dirs_after)


if __name__ == '__main__':
  unittest.main()
