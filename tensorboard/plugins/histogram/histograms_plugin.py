# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""The TensorBoard Histograms plugin.

See `http_api.md` in this directory for specifications of the routes for
this plugin.
"""


import random

from werkzeug import wrappers

from tensorboard import errors
from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.histogram import metadata


_DEFAULT_DOWNSAMPLING = 500  # histograms per time series


class HistogramsPlugin(base_plugin.TBPlugin):
    """Histograms Plugin for TensorBoard.

    This supports both old-style summaries (created with TensorFlow ops
    that output directly to the `histo` field of the proto) and new-
    style summaries (as created by the
    `tensorboard.plugins.histogram.summary` module).
    """

    plugin_name = metadata.PLUGIN_NAME

    # Use a round number + 1 since sampling includes both start and end steps,
    # so N+1 samples corresponds to dividing the step sequence into N intervals.
    SAMPLE_SIZE = 51

    def __init__(self, context):
        """Instantiates HistogramsPlugin via TensorBoard core.

        Args:
          context: A base_plugin.TBContext instance.
        """
        self._downsample_to = (context.sampling_hints or {}).get(
            self.plugin_name, _DEFAULT_DOWNSAMPLING
        )
        self._data_provider = context.data_provider

    def get_plugin_apps(self):
        return {
            "/histograms": self.histograms_route,
            "/tags": self.tags_route,
        }

    def is_active(self):
        return False  # `list_plugins` as called by TB core suffices

    def index_impl(self, ctx, experiment):
        """Return {runName: {tagName: {displayName: ..., description:
        ...}}}."""
        mapping = self._data_provider.list_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
        )
        result = {run: {} for run in mapping}
        for (run, tag_to_content) in mapping.items():
            for (tag, metadatum) in tag_to_content.items():
                description = plugin_util.markdown_to_safe_html(
                    metadatum.description
                )
                result[run][tag] = {
                    "displayName": metadatum.display_name,
                    "description": description,
                }
        return result

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            element_name="tf-histogram-dashboard"
        )

    def histograms_impl(self, ctx, tag, run, experiment, downsample_to=None):
        """Result of the form `(body, mime_type)`.

        At most `downsample_to` events will be returned. If this value is
        `None`, then default downsampling will be performed.

        Raises:
          tensorboard.errors.PublicError: On invalid request.
        """
        sample_count = (
            downsample_to if downsample_to is not None else self._downsample_to
        )
        all_histograms = self._data_provider.read_tensors(
            ctx,
            experiment_id=experiment,
            plugin_name=metadata.PLUGIN_NAME,
            downsample=sample_count,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )
        histograms = all_histograms.get(run, {}).get(tag, None)
        if histograms is None:
            raise errors.NotFoundError(
                "No histogram tag %r for run %r" % (tag, run)
            )
        # Downsample again, even though the data provider is supposed to,
        # because the multiplexer provider currently doesn't. (For
        # well-behaved data providers, this is a no-op.)
        if downsample_to is not None:
            rng = random.Random(0)
            histograms = _downsample(rng, histograms, downsample_to)
        events = [(e.wall_time, e.step, e.numpy.tolist()) for e in histograms]
        return (events, "application/json")

    @wrappers.Request.application
    def tags_route(self, request):
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        index = self.index_impl(ctx, experiment=experiment)
        return http_util.Respond(request, index, "application/json")

    @wrappers.Request.application
    def histograms_route(self, request):
        """Given a tag and single run, return array of histogram values."""
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        tag = request.args.get("tag")
        run = request.args.get("run")
        (body, mime_type) = self.histograms_impl(
            ctx, tag, run, experiment=experiment, downsample_to=self.SAMPLE_SIZE
        )
        return http_util.Respond(request, body, mime_type)


def _downsample(rng, xs, k):
    """Uniformly choose a maximal at-most-`k`-subsequence of `xs`.

    If `k` is larger than `xs`, then the contents of `xs` itself will be
    returned.

    This differs from `random.sample` in that it returns a subsequence
    (i.e., order is preserved) and that it permits `k > len(xs)`.

    Args:
      rng: A `random` interface.
      xs: A sequence (`collections.abc.Sequence`).
      k: A non-negative integer.

    Returns:
      A new list whose elements are a subsequence of `xs` of length
      `min(k, len(xs))`, uniformly selected among such subsequences.
    """

    if k > len(xs):
        return list(xs)
    indices = rng.sample(range(len(xs)), k)
    indices.sort()
    return [xs[i] for i in indices]
