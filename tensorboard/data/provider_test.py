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


class RunTest(tb_test.TestCase):
  def test_eq(self):
    a1 = provider.Run(run_id="a", run_name="aa", start_time=1.25)
    a2 = provider.Run(run_id="a", run_name="aa", start_time=1.25)
    b = provider.Run(run_id="b", run_name="bb", start_time=-1.75)
    self.assertEqual(a1, a2)
    self.assertNotEqual(a1, b)
    self.assertNotEqual(b, object())

  def test_repr(self):
    x = provider.Run(run_id="alpha", run_name="bravo", start_time=1.25)
    repr_ = repr(x)
    self.assertIn(repr(x.run_id), repr_)
    self.assertIn(repr(x.run_name), repr_)
    self.assertIn(repr(x.start_time), repr_)


class ScalarTimeSeriesTest(tb_test.TestCase):
  def test_repr(self):
    x = provider.ScalarTimeSeries(
        max_step=77,
        max_wall_time=1234.5,
        plugin_content=b"AB\xCD\xEF!\x00",
        description="test test",
        display_name="one two",
    )
    repr_ = repr(x)
    self.assertIn(repr(x.max_step), repr_)
    self.assertIn(repr(x.max_wall_time), repr_)
    self.assertIn(repr(x.plugin_content), repr_)
    self.assertIn(repr(x.description), repr_)
    self.assertIn(repr(x.display_name), repr_)

  def test_eq(self):
    x1 = provider.ScalarTimeSeries(77, 1234.5, b"\x12", "one", "two")
    x2 = provider.ScalarTimeSeries(77, 1234.5, b"\x12", "one", "two")
    x3 = provider.ScalarTimeSeries(66, 4321.0, b"\x7F", "hmm", "hum")
    self.assertEqual(x1, x2)
    self.assertNotEqual(x1, x3)
    self.assertNotEqual(x1, object())

  def test_hash(self):
    x1 = provider.ScalarTimeSeries(77, 1234.5, b"\x12", "one", "two")
    x2 = provider.ScalarTimeSeries(77, 1234.5, b"\x12", "one", "two")
    x3 = provider.ScalarTimeSeries(66, 4321.0, b"\x7F", "hmm", "hum")
    self.assertEqual(hash(x1), hash(x2))
    # The next check is technically not required by the `__hash__`
    # contract, but _should_ pass; failure on this assertion would at
    # least warrant some scrutiny.
    self.assertNotEqual(hash(x1), hash(x3))


class ScalarDatumTest(tb_test.TestCase):
  def test_repr(self):
    x = provider.ScalarDatum(step=123, wall_time=234.5, value=-0.125)
    repr_ = repr(x)
    self.assertIn(repr(x.step), repr_)
    self.assertIn(repr(x.wall_time), repr_)
    self.assertIn(repr(x.value), repr_)

  def test_eq(self):
    x1 = provider.ScalarDatum(step=12, wall_time=0.25, value=1.25)
    x2 = provider.ScalarDatum(step=12, wall_time=0.25, value=1.25)
    x3 = provider.ScalarDatum(step=23, wall_time=3.25, value=-0.5)
    self.assertEqual(x1, x2)
    self.assertNotEqual(x1, x3)
    self.assertNotEqual(x1, object())

  def test_hash(self):
    x1 = provider.ScalarDatum(step=12, wall_time=0.25, value=1.25)
    x2 = provider.ScalarDatum(step=12, wall_time=0.25, value=1.25)
    x3 = provider.ScalarDatum(step=23, wall_time=3.25, value=-0.5)
    self.assertEqual(hash(x1), hash(x2))
    # The next check is technically not required by the `__hash__`
    # contract, but _should_ pass; failure on this assertion would at
    # least warrant some scrutiny.
    self.assertNotEqual(hash(x1), hash(x3))


class RunTagFilterTest(tb_test.TestCase):
  def test_defensive_copy(self):
    runs = ["r1"]
    tags = ["t1"]
    f = provider.RunTagFilter(runs, tags)
    runs.append("r2")
    tags.pop()
    self.assertEqual(frozenset(f.runs), frozenset(["r1"]))
    self.assertEqual(frozenset(f.tags), frozenset(["t1"]))

  def test_repr(self):
    x = provider.RunTagFilter(runs=["one", "two"], tags=["three", "four"])
    repr_ = repr(x)
    self.assertIn(repr(x.runs), repr_)
    self.assertIn(repr(x.tags), repr_)


if __name__ == "__main__":
  tb_test.main()
