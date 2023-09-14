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


import numpy as np

from tensorboard import test as tb_test
from tensorboard.data import provider


class DataProviderTest(tb_test.TestCase):
    def test_abstract(self):
        with self.assertRaisesRegex(TypeError, "abstract class"):
            provider.DataProvider()


class ExperimentMetadataTest(tb_test.TestCase):
    def test_defaults(self):
        provider.ExperimentMetadata()

    def test_attributes(self):
        e1 = provider.ExperimentMetadata(
            data_location="/tmp/logs",
            experiment_name="FooExperiment",
            experiment_description="Experiment on Foo",
            creation_time=1.25,
        )
        self.assertEqual(e1.data_location, "/tmp/logs")
        self.assertEqual(e1.experiment_name, "FooExperiment")
        self.assertEqual(e1.experiment_description, "Experiment on Foo")
        self.assertEqual(e1.creation_time, 1.25)

    def test_eq(self):
        def md(**kwargs):
            kwargs.setdefault("data_location", "/tmp/logs")
            kwargs.setdefault("experiment_name", "FooExperiment")
            kwargs.setdefault("experiment_description", "Experiment on Foo")
            kwargs.setdefault("creation_time", 1.25)
            return provider.ExperimentMetadata(**kwargs)

        a1 = md()
        a2 = md()
        b = md(experiment_name="BarExperiment")
        self.assertEqual(a1, a2)
        self.assertNotEqual(a1, b)
        self.assertNotEqual(b, object())

    def test_repr(self):
        x = provider.ExperimentMetadata(
            data_location="/tmp/logs",
            experiment_name="FooExperiment",
            experiment_description="Experiment on Foo",
            creation_time=1.25,
        )
        repr_ = repr(x)
        self.assertIn(repr(x.data_location), repr_)
        self.assertIn(repr(x.experiment_name), repr_)
        self.assertIn(repr(x.experiment_description), repr_)
        self.assertIn(repr(x.creation_time), repr_)


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
    def _scalar_time_series(
        self,
        max_step,
        max_wall_time,
        plugin_content,
        description,
        display_name,
        last_value,
    ):
        # Helper to use explicit kwargs.
        return provider.ScalarTimeSeries(
            max_step=max_step,
            max_wall_time=max_wall_time,
            plugin_content=plugin_content,
            description=description,
            display_name=display_name,
            last_value=last_value,
        )

    def test_repr(self):
        x = provider.ScalarTimeSeries(
            max_step=77,
            max_wall_time=1234.5,
            plugin_content=b"AB\xCD\xEF!\x00",
            description="test test",
            display_name="one two",
            last_value=0.0001,
        )
        repr_ = repr(x)
        self.assertIn(repr(x.max_step), repr_)
        self.assertIn(repr(x.max_wall_time), repr_)
        self.assertIn(repr(x.plugin_content), repr_)
        self.assertIn(repr(x.description), repr_)
        self.assertIn(repr(x.display_name), repr_)
        self.assertIn(repr(x.last_value), repr_)

    def test_eq(self):
        x1 = self._scalar_time_series(77, 1234.5, b"\x12", "one", "two", 512)
        x2 = self._scalar_time_series(77, 1234.5, b"\x12", "one", "two", 512)
        x3 = self._scalar_time_series(66, 4321.0, b"\x7F", "hmm", "hum", 1024)
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_hash(self):
        x1 = self._scalar_time_series(77, 1234.5, b"\x12", "one", "two", 512)
        x2 = self._scalar_time_series(77, 1234.5, b"\x12", "one", "two", 512)
        x3 = self._scalar_time_series(66, 4321.0, b"\x7F", "hmm", "hum", 1024)
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


class TensorTimeSeriesTest(tb_test.TestCase):
    def _tensor_time_series(
        self, max_step, max_wall_time, plugin_content, description, display_name
    ):
        # Helper to use explicit kwargs.
        return provider.TensorTimeSeries(
            max_step=max_step,
            max_wall_time=max_wall_time,
            plugin_content=plugin_content,
            description=description,
            display_name=display_name,
        )

    def test_repr(self):
        x = provider.TensorTimeSeries(
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
        x1 = self._tensor_time_series(77, 1234.5, b"\x12", "one", "two")
        x2 = self._tensor_time_series(77, 1234.5, b"\x12", "one", "two")
        x3 = self._tensor_time_series(66, 4321.0, b"\x7F", "hmm", "hum")
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_hash(self):
        x1 = self._tensor_time_series(77, 1234.5, b"\x12", "one", "two")
        x2 = self._tensor_time_series(77, 1234.5, b"\x12", "one", "two")
        x3 = self._tensor_time_series(66, 4321.0, b"\x7F", "hmm", "hum")
        self.assertEqual(hash(x1), hash(x2))
        # The next check is technically not required by the `__hash__`
        # contract, but _should_ pass; failure on this assertion would at
        # least warrant some scrutiny.
        self.assertNotEqual(hash(x1), hash(x3))


class TensorDatumTest(tb_test.TestCase):
    def test_repr(self):
        x = provider.TensorDatum(
            step=123, wall_time=234.5, numpy=np.array(-0.25)
        )
        repr_ = repr(x)
        self.assertIn(repr(x.step), repr_)
        self.assertIn(repr(x.wall_time), repr_)
        self.assertIn(repr(x.numpy), repr_)

    def test_eq(self):
        nd = np.array
        x1 = provider.TensorDatum(step=12, wall_time=0.25, numpy=nd([1.0, 2.0]))
        x2 = provider.TensorDatum(step=12, wall_time=0.25, numpy=nd([1.0, 2.0]))
        x3 = provider.TensorDatum(
            step=23, wall_time=3.25, numpy=nd([-0.5, -2.5])
        )
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_eq_with_rank0_tensor(self):
        x1 = provider.TensorDatum(
            step=12, wall_time=0.25, numpy=np.array([1.25])
        )
        x2 = provider.TensorDatum(
            step=12, wall_time=0.25, numpy=np.array([1.25])
        )
        x3 = provider.TensorDatum(
            step=23, wall_time=3.25, numpy=np.array([1.25])
        )
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_hash(self):
        x = provider.TensorDatum(
            step=12, wall_time=0.25, numpy=np.array([1.25])
        )
        with self.assertRaisesRegex(TypeError, "unhashable type"):
            hash(x)


class BlobSequenceTimeSeriesTest(tb_test.TestCase):
    def _blob_sequence_time_series(
        self,
        max_step,
        max_wall_time,
        max_length,
        plugin_content,
        description,
        display_name,
    ):
        # Helper to use explicit kwargs.
        return provider.BlobSequenceTimeSeries(
            max_step=max_step,
            max_wall_time=max_wall_time,
            max_length=max_length,
            plugin_content=plugin_content,
            description=description,
            display_name=display_name,
        )

    def test_repr(self):
        x = provider.BlobSequenceTimeSeries(
            max_step=77,
            max_wall_time=1234.5,
            max_length=6,
            plugin_content=b"AB\xCD\xEF!\x00",
            description="test test",
            display_name="one two",
        )
        repr_ = repr(x)
        self.assertIn(repr(x.max_step), repr_)
        self.assertIn(repr(x.max_wall_time), repr_)
        self.assertIn(repr(x.max_length), repr_)
        self.assertIn(repr(x.plugin_content), repr_)
        self.assertIn(repr(x.description), repr_)
        self.assertIn(repr(x.display_name), repr_)

    def test_eq(self):
        x1 = self._blob_sequence_time_series(
            77, 1234.5, 6, b"\x12", "one", "two"
        )
        x2 = self._blob_sequence_time_series(
            77, 1234.5, 6, b"\x12", "one", "two"
        )
        x3 = self._blob_sequence_time_series(
            66, 4321.0, 7, b"\x7F", "hmm", "hum"
        )
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_hash(self):
        x1 = self._blob_sequence_time_series(
            77, 1234.5, 6, b"\x12", "one", "two"
        )
        x2 = self._blob_sequence_time_series(
            77, 1234.5, 6, b"\x12", "one", "two"
        )
        x3 = self._blob_sequence_time_series(
            66, 4321.0, 7, b"\x7F", "hmm", "hum"
        )
        self.assertEqual(hash(x1), hash(x2))
        # The next check is technically not required by the `__hash__`
        # contract, but _should_ pass; failure on this assertion would at
        # least warrant some scrutiny.
        self.assertNotEqual(hash(x1), hash(x3))


class BlobReferenceTest(tb_test.TestCase):
    def test_repr(self):
        x = provider.BlobReference(url="foo", blob_key="baz")
        repr_ = repr(x)
        self.assertIn(repr(x.url), repr_)
        self.assertIn(repr(x.blob_key), repr_)

    def test_eq(self):
        x1 = provider.BlobReference(url="foo", blob_key="baz")
        x2 = provider.BlobReference(url="foo", blob_key="baz")
        x3 = provider.BlobReference(url="foo", blob_key="qux")
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_hash(self):
        x1 = provider.BlobReference(url="foo", blob_key="baz")
        x2 = provider.BlobReference(url="foo", blob_key="baz")
        x3 = provider.BlobReference(url="foo", blob_key="qux")
        self.assertEqual(hash(x1), hash(x2))
        # The next check is technically not required by the `__hash__`
        # contract, but _should_ pass; failure on this assertion would at
        # least warrant some scrutiny.
        self.assertNotEqual(hash(x1), hash(x3))


class BlobSequenceDatumTest(tb_test.TestCase):
    def test_repr(self):
        x = provider.BlobSequenceDatum(
            step=123, wall_time=234.5, values=("foo", "bar", "baz")
        )
        repr_ = repr(x)
        self.assertIn(repr(x.step), repr_)
        self.assertIn(repr(x.wall_time), repr_)
        self.assertIn(repr(x.values), repr_)

    def test_eq(self):
        x1 = provider.BlobSequenceDatum(
            step=12, wall_time=0.25, values=("foo", "bar", "baz")
        )
        x2 = provider.BlobSequenceDatum(
            step=12, wall_time=0.25, values=("foo", "bar", "baz")
        )
        x3 = provider.BlobSequenceDatum(
            step=23, wall_time=3.25, values=("qux",)
        )
        self.assertEqual(x1, x2)
        self.assertNotEqual(x1, x3)
        self.assertNotEqual(x1, object())

    def test_hash(self):
        x1 = provider.BlobSequenceDatum(
            step=12, wall_time=0.25, values=("foo", "bar", "baz")
        )
        x2 = provider.BlobSequenceDatum(
            step=12, wall_time=0.25, values=("foo", "bar", "baz")
        )
        x3 = provider.BlobSequenceDatum(
            step=23, wall_time=3.25, values=("qux",)
        )
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

    def test_validates_runs_tags(self):
        # Accidentally passed scalar strings
        with self.assertRaisesRegex(TypeError, "runs:.*got.*str.*myrun"):
            provider.RunTagFilter(runs="myrun")
        with self.assertRaisesRegex(TypeError, "tags:.*got.*str.*mytag"):
            provider.RunTagFilter(tags="mytag")

        # Passed collections with non-string elements
        with self.assertRaisesRegex(
            TypeError, "runs:.*got item of type.*NoneType.*None"
        ):
            provider.RunTagFilter(runs=[None])
        with self.assertRaisesRegex(
            TypeError, "tags:.*got item of type.*int.*3"
        ):
            provider.RunTagFilter(tags=["one", "two", 3])

    def test_repr(self):
        x = provider.RunTagFilter(runs=["one", "two"], tags=["three", "four"])
        repr_ = repr(x)
        self.assertIn(repr(x.runs), repr_)
        self.assertIn(repr(x.tags), repr_)


if __name__ == "__main__":
    tb_test.main()
