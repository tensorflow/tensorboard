# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Unit tests for `tensorboard.data.provider`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six

from tensorboard import test as tb_test
from tensorboard.data import provider


class DataProviderTest(tb_test.TestCase):
  def test_abstract(self):
    with six.assertRaisesRegex(self, TypeError, "abstract class"):
      provider.DataProvider()


class RunTagFilterTest(tb_test.TestCase):
  def test_defensive_copy(self):
    runs = ["r1"]
    tags = ["t1"]
    f = provider.RunTagFilter(runs, tags)
    runs.append("r2")
    tags.pop()
    self.assertEqual(frozenset(f.runs), frozenset(["r1"]))
    self.assertEqual(frozenset(f.tags), frozenset(["t1"]))


if __name__ == "__main__":
  tb_test.main()
