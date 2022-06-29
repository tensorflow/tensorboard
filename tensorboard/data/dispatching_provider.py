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
"""A data provider that dispatches to sub-providers based on prefix."""

import base64
import json

from tensorboard import errors
from tensorboard.data import provider


# Separator between prefix and sub-ID.
_SEPARATOR = ":"


class DispatchingDataProvider(provider.DataProvider):
    """Data provider that dispatches to sub-providers based on prefix.

    If you have one data provider that talks to the Foo service with IDs
    like `123` and another that talks to the Bar service with IDs like
    `3a28213a`, then this data provider lets you talk to both of them
    with IDs like `foo:123` and `bar:3a28213a`, respectively. The part
    before the colon is the *prefix*, and identifies the sub-provider to
    which to dispatch. The part after the colon is the *sub-ID*, and is
    passed verbatim to the sub-provider. The sub-ID may contain any
    characters, including colons, so the sub-providers may themselves be
    hierarchical.

    A `default_prefix` which refers to an existing data provider prefix can be
    specified for the case where an experiment ID does not contain a colon. Note
    that this is not used as a fallback when the prefix is simply not one of the
    registered prefixes; that will always be an error.
    """

    # Implementation note: this data provider provides a simple
    # pass-through for most methods, but has extra logic for methods
    # related to blob keys, where we need to annotate or extract the
    # associated sub-provider.

    def __init__(
        self, providers, unprefixed_provider=None, default_prefix=None
    ):
        """Initialize a `DispatchingDataProvider`.

        Args:
          providers: Dict mapping prefix (`str`) to sub-provider
            instance (`provider.DataProvider`). Keys will appear in
            experiment IDs and so must be URL-safe.
          unprefixed_provider: Deprecated, optional `provider.DataProvider`
            instance to use with experiment IDs that do not have a prefix.
          default_prefix: Optional string that refers to one of the existing data
            provider prefixes, used for unprefixed experiment IDs.

        Raises:
          ValueError: If any of the provider keys contains a colon,
            which would make it impossible to match.
        """
        self._providers = dict(providers)
        invalid_names = sorted(k for k in self._providers if _SEPARATOR in k)
        if invalid_names:
            raise ValueError("Invalid provider key(s): %r" % invalid_names)

        # TODO(b/237101984): Remove unprefixed provider.
        self._unprefixed_provider = unprefixed_provider

        if (
            default_prefix is not None
            and default_prefix not in self._providers.keys()
        ):
            raise ValueError(
                "Unknown data provider prefix: %s" % default_prefix
            )
        self._default_provider = self._providers.get(default_prefix)

    def _parse_eid(self, experiment_id):
        """Parse an experiment ID into prefix, sub-ID, and sub-provider.

        The returned prefix may be `None` if no prefix is found in experiment
        ID. If the experiment ID is invalid, this method may raise an
        `errors.NotFoundError`.
        """
        parts = experiment_id.split(_SEPARATOR, 1)
        if len(parts) == 1:
            if self._default_provider is None:
                raise errors.NotFoundError(
                    "No data provider found for unprefixed experiment ID: %r"
                    % experiment_id
                )
            return (None, experiment_id, self._default_provider)
        (prefix, sub_eid) = parts
        sub_provider = self._providers.get(prefix)
        if sub_provider is None:
            raise errors.NotFoundError(
                "Unknown prefix in experiment ID: %r" % experiment_id
            )
        return (prefix, sub_eid, sub_provider)

    def _simple_delegate(get_method):
        """Dispatch on experiment ID, forwarding args and result unchanged."""

        def wrapper(self, *args, experiment_id, **kwargs):
            (_, sub_eid, sub_provider) = self._parse_eid(experiment_id)
            method = get_method(sub_provider)
            return method(*args, experiment_id=sub_eid, **kwargs)

        return wrapper

    experiment_metadata = _simple_delegate(lambda p: p.experiment_metadata)
    list_plugins = _simple_delegate(lambda p: p.list_plugins)
    list_runs = _simple_delegate(lambda p: p.list_runs)
    list_scalars = _simple_delegate(lambda p: p.list_scalars)
    read_scalars = _simple_delegate(lambda p: p.read_scalars)
    list_tensors = _simple_delegate(lambda p: p.list_tensors)
    read_tensors = _simple_delegate(lambda p: p.read_tensors)
    list_blob_sequences = _simple_delegate(lambda p: p.list_blob_sequences)

    def read_blob_sequences(self, *args, experiment_id, **kwargs):
        (prefix, sub_eid, sub_provider) = self._parse_eid(experiment_id)
        result = sub_provider.read_blob_sequences(
            *args, experiment_id=sub_eid, **kwargs
        )
        for tag_to_data in result.values():
            for (tag, old_data) in tag_to_data.items():
                new_data = [
                    provider.BlobSequenceDatum(
                        step=d.step,
                        wall_time=d.wall_time,
                        values=_convert_blob_references(prefix, d.values),
                    )
                    for d in old_data
                ]
                tag_to_data[tag] = new_data
        return result

    def read_blob(self, ctx, blob_key):
        (prefix, sub_key) = _decode_blob_key(blob_key)
        if prefix is None:
            if self._default_provider is None:
                raise errors.NotFoundError(
                    "Invalid blob key: no default provider for unprefixed blob key"
                )
            return self._default_provider.read_blob(ctx, blob_key=sub_key)
        sub_provider = self._providers.get(prefix)
        if sub_provider is None:
            raise errors.NotFoundError(
                "Invalid blob key: no such provider: %r; have: %r"
                % (prefix, sorted(self._providers))
            )
        return sub_provider.read_blob(ctx, blob_key=sub_key)


def _convert_blob_references(prefix, references):
    """Encode all blob keys in a list of blob references.

    Args:
      prefix: The prefix of the sub-provider that generated the sub-key,
        or `None` if no prefix is found in the blob key.
      references: A list of `provider.BlobReference`s emitted by a
        sub-provider.

    Returns:
      A new list of `provider.BlobReference`s whose blob keys have been
      encoded per `_encode_blob_key`.
    """
    return [
        provider.BlobReference(
            blob_key=_encode_blob_key(prefix, r.blob_key),
            url=r.url,
        )
        for r in references
    ]


def _encode_blob_key(prefix, sub_key):
    """Encode a blob key from prefix (optional) and sub-key.

    Args:
      prefix: The prefix of the sub-provider that generated the sub-key,
        or `None` if no prefix is found in the blob key.
      sub_key: The opaque key from the sub-provider.

    Returns:
      A string encoding `prefix` and `sub_key` injectively.
    """
    payload = [prefix, sub_key]
    json_str = json.dumps(payload, separators=(",", ":"))
    b64_str = base64.urlsafe_b64encode(json_str.encode("ascii")).decode("ascii")
    return b64_str.rstrip("=")


def _decode_blob_key(key):
    """Decode a prefix (optional) and sub-key from a blob key.

    Left inverse of `_encode_blob_key`.

    Args:
      key: A blob key in the form returned by `_encode_blob_key`.

    Returns;
      A tuple `(prefix, sub_key)`, where `prefix` is either `None` or a
      sub-provider prefix, and `sub_key` is an opaque key from a
      sub-provider.

    Raises:
      errors.NotFoundError: If `key` is invalid and has no preimage.
    """
    failure = errors.NotFoundError("Invalid blob key: %r" % key)

    b64_str = key + "=="  # ensure adequate padding (overpadding is okay)
    json_str = base64.urlsafe_b64decode(b64_str).decode("ascii")
    payload = json.loads(json_str)
    if not isinstance(payload, list) or len(payload) != 2:
        raise failure
    (prefix, sub_key) = payload
    if not (prefix is None or isinstance(prefix, str)):
        raise failure
    if not isinstance(sub_key, str):
        raise failure
    return (prefix, sub_key)
