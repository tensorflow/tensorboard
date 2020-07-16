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


class FiniteProvider(provider.DataProvider):
    """Data provider with parameterized test data."""

    def __init__(self, name, eids):
        self._name = name
        self._eids = eids

    def _validate_eid(self, eid):
        if eid not in self._eids:
            raise errors.NotFoundError("%r not in %r" % (eid, self._eids))

    def data_location(self, ctx, *, experiment_id):
        self._validate_eid(experiment_id)
        return "%s://%s" % (self._name, experiment_id)

    def experiment_metadata(self, ctx, *, experiment_id):
        return None

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
        run_tag_filter=None
    ):
        self._validate_eid(experiment_id)
        if run_tag_filter is None:
            run_tag_filter = provider.RunTagFilter()
        runs = run_tag_filter.runs or []
        tags = run_tag_filter.tags or []
        result = {}
        for run in runs:
            run_data = {}
            result[run] = run_data
            for tag in tags:
                run_data[tag] = [
                    provider.ScalarDatum(
                        step=0, wall_time=0.0, value=float(len(plugin_name))
                    ),
                    provider.ScalarDatum(
                        step=1, wall_time=0.5, value=float(len(experiment_id))
                    ),
                ]
        return result

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
        run_tag_filter=None
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
        run_tag_filter=None
    ):
        self._validate_eid(experiment_id)
        if run_tag_filter is None:
            run_tag_filter = provider.RunTagFilter()
        runs = run_tag_filter.runs or []
        tags = run_tag_filter.tags or []
        result = {}
        for run in runs:
            run_data = {}
            result[run] = run_data
            for tag in tags:
                run_data[tag] = [
                    provider.BlobSequenceDatum(
                        step=0,
                        wall_time=0.0,
                        values=[
                            self._make_blob_reference(
                                "experiment: %s" % experiment_id
                            ),
                            self._make_blob_reference(
                                "downsample: %s" % downsample
                            ),
                        ],
                    ),
                ]
        return result

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
        providers = {
            "foo": FiniteProvider("foo", ["123", "456"]),
            "bar": FiniteProvider("Bar", ["a:b:c", "@xyz@"]),
        }
        unprefixed = FiniteProvider("BAZ", ["baz"])
        self.with_unpfx = dispatching_provider.DispatchingDataProvider(
            providers, unprefixed_provider=unprefixed
        )
        self.without_unpfx = dispatching_provider.DispatchingDataProvider(
            providers
        )

    def test_data_location(self):
        self.assertEqual(
            self.with_unpfx.data_location(_ctx(), experiment_id="foo:123"),
            "foo://123",
        )
        self.assertEqual(
            self.with_unpfx.data_location(_ctx(), experiment_id="bar:a:b:c"),
            "Bar://a:b:c",
        )
        self.assertEqual(
            self.with_unpfx.data_location(_ctx(), experiment_id="baz"),
            "BAZ://baz",
        )
        with self.assertRaisesRegex(
            errors.NotFoundError, "Unknown data provider key: 'quux'"
        ):
            self.with_unpfx.data_location(_ctx(), experiment_id="quux:hmm")
        with self.assertRaisesRegex(
            errors.NotFoundError, "No unprefixed data provider specified"
        ):
            self.without_unpfx.data_location(_ctx(), experiment_id="quux")

    def test_scalars(self):
        listing = self.with_unpfx.list_scalars(
            _ctx(), experiment_id="foo:123", plugin_name="scalars"
        )
        self.assertEqual(
            listing,
            {
                "123/train": {
                    "loss.scalars": provider.ScalarTimeSeries(
                        max_step=2,
                        max_wall_time=0.5,
                        plugin_content=b"",
                        description="Hello from foo",
                        display_name="loss",
                    )
                }
            },
        )

        reading = self.with_unpfx.read_scalars(
            _ctx(),
            experiment_id="foo:123",
            plugin_name="scalars",
            downsample=1000,
            run_tag_filter=provider.RunTagFilter(
                ["123/train"], ["loss.scalars"]
            ),
        )
        self.assertEqual(
            reading,
            {
                "123/train": {
                    "loss.scalars": [
                        provider.ScalarDatum(
                            step=0, wall_time=0.0, value=float(len("scalars"))
                        ),
                        provider.ScalarDatum(
                            step=1, wall_time=0.5, value=float(len("123"))
                        ),
                    ]
                }
            },
        )

    def test_blob_sequences(self):
        def get_blobs(dp, experiment_id):
            """List, read, and fetch all blobs in a given context."""
            listing = dp.list_blob_sequences(
                _ctx(), experiment_id=experiment_id, plugin_name="images"
            )
            reading = dp.read_blob_sequences(
                _ctx(),
                experiment_id=experiment_id,
                plugin_name="images",
                downsample=10,
                run_tag_filter=provider.RunTagFilter(
                    runs=list(listing),
                    tags=sorted(set().union(*listing.values())),
                ),
            )
            result = {}
            for run in reading:
                result[run] = {}
                for tag in reading[run]:
                    result[run][tag] = []
                    for datum in reading[run][tag]:
                        result[run][tag].append(
                            [
                                dp.read_blob(_ctx(), blob_key=ref.blob_key)
                                for ref in datum.values
                            ]
                        )
            return result

        with self.subTest("prefixed sub-provider"):
            result = get_blobs(self.with_unpfx, "foo:123")
            self.assertEqual(
                result,
                {
                    "123/test": {
                        "input.images": [
                            [b"experiment: 123", b"downsample: 10"]
                        ]
                    }
                },
            )

        with self.subTest("unprefixed sub-provider"):
            result = get_blobs(self.with_unpfx, "baz")
            self.assertEqual(
                result,
                {
                    "baz/test": {
                        "input.images": [
                            [b"experiment: baz", b"downsample: 10"]
                        ]
                    }
                },
            )

        with self.subTest("error cases"):
            with self.assertRaisesRegex(
                errors.NotFoundError, "Unknown data provider key: 'quux'"
            ):
                get_blobs(self.with_unpfx, "quux:hmm")
            with self.assertRaisesRegex(
                errors.NotFoundError, "No unprefixed data provider specified"
            ):
                result = get_blobs(self.without_unpfx, "baz")


def _ctx():
    return context.RequestContext()


if __name__ == "__main__":
    tb_test.main()
