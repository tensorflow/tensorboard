# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for `tensorboard.data.dispatching_provider`."""

import base64

from tensorboard import errors
from tensorboard import context
from tensorboard import test as tb_test
from tensorboard.data import dispatching_provider
from tensorboard.data import provider


class PlaceholderDataProvider(provider.DataProvider):
    """Data provider with parameterized test data."""

    def __init__(self, name, eids):
        self._name = name
        self._eids = eids

    def _validate_eid(self, eid):
        if eid not in self._eids:
            raise errors.NotFoundError("%r not in %r" % (eid, self._eids))

    def experiment_metadata(self, ctx, *, experiment_id):
        self._validate_eid(experiment_id)
        data_location = "%s://%s" % (self._name, experiment_id)
        return provider.ExperimentMetadata(data_location=data_location)

    def list_plugins(self, ctx, *, experiment_id):
        self._validate_eid(experiment_id)
        return ["%s_a" % experiment_id, "%s_b" % experiment_id]

    def list_runs(self, ctx, *, experiment_id):
        self._validate_eid(experiment_id)
        return ["%s/train" % experiment_id, "%s/test" % experiment_id]

    def list_scalars(
        self, ctx, *, experiment_id, plugin_name, run_tag_filter=None
    ):
        self._validate_eid(experiment_id)
        run_name = "%s/train" % experiment_id
        tag_name = "loss.%s" % plugin_name
        return {
            run_name: {
                tag_name: provider.ScalarTimeSeries(
                    max_step=2,
                    max_wall_time=0.5,
                    plugin_content=b"",
                    description="Hello from %s" % self._name,
                    display_name="loss",
                )
            }
        }

    def read_scalars(
        self,
        ctx,
        *,
        experiment_id,
        plugin_name,
        downsample=None,
        run_tag_filter=None,
    ):
        self._validate_eid(experiment_id)
        if run_tag_filter is None:
            run_tag_filter = provider.RunTagFilter()
        rtf = run_tag_filter
        expected_run = "%s/train" % experiment_id
        expected_tag = "loss.%s" % plugin_name
        if rtf.runs is not None and expected_run not in rtf.runs:
            return {}
        if rtf.tags is not None and expected_tag not in rtf.tags:
            return {}
        return {
            expected_run: {
                expected_tag: [
                    provider.ScalarDatum(
                        step=0, wall_time=0.0, value=float(len(plugin_name))
                    ),
                    provider.ScalarDatum(
                        step=1, wall_time=0.5, value=float(len(experiment_id))
                    ),
                ]
            }
        }

    def list_tensors(
        self, ctx, *, experiment_id, plugin_name, run_tag_filter=None
    ):
        # We bravely assume that `list_tensors` and `read_tensors` work
        # the same as their scalar counterparts.
        raise NotImplementedError()

    def read_tensors(
        self,
        ctx,
        *,
        experiment_id,
        plugin_name,
        downsample=None,
        run_tag_filter=None,
    ):
        raise NotImplementedError()

    def list_blob_sequences(
        self, ctx, *, experiment_id, plugin_name, run_tag_filter=None
    ):
        self._validate_eid(experiment_id)
        run_name = "%s/test" % experiment_id
        tag_name = "input.%s" % plugin_name
        return {
            run_name: {
                tag_name: provider.BlobSequenceTimeSeries(
                    max_step=0,
                    max_wall_time=0.0,
                    max_length=2,
                    plugin_content=b"",
                    description="Greetings via %s" % self._name,
                    display_name="input",
                )
            }
        }

    def read_blob_sequences(
        self,
        ctx,
        *,
        experiment_id,
        plugin_name,
        downsample=None,
        run_tag_filter=None,
    ):
        self._validate_eid(experiment_id)
        if run_tag_filter is None:
            run_tag_filter = provider.RunTagFilter()
        rtf = run_tag_filter
        expected_run = "%s/test" % experiment_id
        expected_tag = "input.%s" % plugin_name
        if rtf.runs is not None and expected_run not in rtf.runs:
            return {}
        if rtf.tags is not None and expected_tag not in rtf.tags:
            return {}
        return {
            expected_run: {
                expected_tag: [
                    provider.BlobSequenceDatum(
                        step=0,
                        wall_time=0.0,
                        values=[
                            self._make_blob_reference(
                                "experiment: %s" % experiment_id
                            ),
                            self._make_blob_reference("name: %s" % self._name),
                        ],
                    ),
                ]
            }
        }

    def _make_blob_reference(self, text):
        key = base64.urlsafe_b64encode(
            ("%s:%s" % (self._name, text)).encode("utf-8")
        ).decode("ascii")
        return provider.BlobReference(key)

    def read_blob(self, ctx, *, blob_key):
        payload = base64.urlsafe_b64decode(blob_key)
        prefix = ("%s:" % self._name).encode("utf-8")
        if not payload.startswith(prefix):
            raise errors.NotFound("not %r.startswith(%r)" % (payload, prefix))
        return payload[len(prefix) :]


class DispatchingDataProviderTest(tb_test.TestCase):
    def setUp(self):
        self.foo_provider = PlaceholderDataProvider("foo", ["123", "456"])
        self.bar_provider = PlaceholderDataProvider("Bar", ["a:b:c", "@xyz@"])
        self.baz_provider = PlaceholderDataProvider("BAZ", ["baz"])
        providers = {
            "foo": self.foo_provider,
            "bar": self.bar_provider,
            "baz": self.baz_provider,
        }
        unprefixed = self.baz_provider
        self.with_default_pfx = dispatching_provider.DispatchingDataProvider(
            providers, default_prefix="baz"
        )
        self.without_default_pfx = dispatching_provider.DispatchingDataProvider(
            providers
        )

    def test_unknown_default_prefix__raises_error(self):
        self.foo_provider = PlaceholderDataProvider("foo", ["123", "456"])
        with self.assertRaisesRegex(
            ValueError, "Unknown data provider prefix: bar"
        ):
            dispatching_provider.DispatchingDataProvider(
                {"foo": self.foo_provider}, default_prefix="bar"
            )

    def test_experiment_metadata(self):
        self.assertEqual(
            self.with_default_pfx.experiment_metadata(
                _ctx(), experiment_id="foo:123"
            ),
            self.foo_provider.experiment_metadata(_ctx(), experiment_id="123"),
        )
        self.assertEqual(
            self.with_default_pfx.experiment_metadata(
                _ctx(), experiment_id="bar:a:b:c"
            ),
            self.bar_provider.experiment_metadata(
                _ctx(), experiment_id="a:b:c"
            ),
        )
        self.assertEqual(
            self.with_default_pfx.experiment_metadata(
                _ctx(), experiment_id="baz"
            ),
            self.baz_provider.experiment_metadata(_ctx(), experiment_id="baz"),
        )
        with self.assertRaisesRegex(
            errors.NotFoundError, "Unknown prefix in experiment ID: 'quux:hmm'"
        ):
            self.with_default_pfx.experiment_metadata(
                _ctx(), experiment_id="quux:hmm"
            )
        with self.assertRaisesRegex(
            errors.NotFoundError,
            "No data provider found for unprefixed experiment ID: 'quux'",
        ):
            self.without_default_pfx.experiment_metadata(
                _ctx(), experiment_id="quux"
            )

    def test_scalars(self):
        listing = self.with_default_pfx.list_scalars(
            _ctx(), experiment_id="foo:123", plugin_name="scalars"
        )
        self.assertEqual(
            listing,
            self.foo_provider.list_scalars(
                _ctx(), experiment_id="123", plugin_name="scalars"
            ),
        )

        reading = self.with_default_pfx.read_scalars(
            _ctx(),
            experiment_id="foo:123",
            plugin_name="scalars",
            downsample=1000,
            run_tag_filter=provider.RunTagFilter(
                ["123/train"], ["loss.scalars"]
            ),
        )
        expected_reading = self.foo_provider.read_scalars(
            _ctx(),
            experiment_id="123",
            plugin_name="scalars",
            downsample=1000,
            run_tag_filter=provider.RunTagFilter(
                ["123/train"], ["loss.scalars"]
            ),
        )
        self.assertNotEmpty(expected_reading)
        self.assertEqual(reading, expected_reading)

    def _get_blobs(self, data_provider, experiment_id):
        """Read and fetch all blobs for an experiment."""
        reading = data_provider.read_blob_sequences(
            _ctx(),
            experiment_id=experiment_id,
            plugin_name="images",
            downsample=10,
            run_tag_filter=provider.RunTagFilter(),
        )
        result = {}
        for run in reading:
            result[run] = {}
            for tag in reading[run]:
                result[run][tag] = []
                for datum in reading[run][tag]:
                    blob_values = [
                        data_provider.read_blob(_ctx(), blob_key=ref.blob_key)
                        for ref in datum.values
                    ]
                    result[run][tag].append(blob_values)
        return result

    def test_blob_sequences_prefixed(self):
        listing = self.with_default_pfx.list_blob_sequences(
            _ctx(), experiment_id="bar:a:b:c", plugin_name="images"
        )
        expected_listing = self.bar_provider.list_blob_sequences(
            _ctx(), experiment_id="a:b:c", plugin_name="images"
        )
        self.assertEqual(listing, expected_listing)

        blobs = self._get_blobs(self.with_default_pfx, "bar:a:b:c")
        expected_blobs = self._get_blobs(self.bar_provider, "a:b:c")
        self.assertEqual(blobs, expected_blobs)

    def test_blob_sequences_unprefixed(self):
        listing = self.with_default_pfx.list_blob_sequences(
            _ctx(), experiment_id="baz", plugin_name="images"
        )
        expected_listing = self.baz_provider.list_blob_sequences(
            _ctx(), experiment_id="baz", plugin_name="images"
        )
        self.assertEqual(listing, expected_listing)

        blobs = self._get_blobs(self.with_default_pfx, "baz")
        expected_blobs = self._get_blobs(self.baz_provider, "baz")
        self.assertEqual(blobs, expected_blobs)

    def test_blobs_error_cases(self):
        with self.assertRaisesRegex(
            errors.NotFoundError,
            "Unknown prefix in experiment ID: 'quux:hmm'",
        ):
            self._get_blobs(self.with_default_pfx, "quux:hmm")
        with self.assertRaisesRegex(
            errors.NotFoundError,
            "No data provider found for unprefixed experiment ID: 'baz'",
        ):
            result = self._get_blobs(self.without_default_pfx, "baz")


def _ctx():
    return context.RequestContext()


if __name__ == "__main__":
    tb_test.main()
