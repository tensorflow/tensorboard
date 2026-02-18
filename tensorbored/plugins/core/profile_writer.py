# Copyright 2026 The TensorFlow Authors. All Rights Reserved.
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
"""Utility for writing TensorBoard default profiles from Python.

This module provides a simple API for training scripts to set default
TensorBoard dashboard configurations. When users load TensorBoard, the
default profile will be automatically applied.

Example usage:

    from tensorbored.plugins.core import profile_writer

    # Create a profile with pinned cards and run colors
    profile = profile_writer.create_profile(
        name="Training Dashboard",
        pinned_cards=[
            {"plugin": "scalars", "tag": "train/loss"},
            {"plugin": "scalars", "tag": "train/accuracy"},
            {"plugin": "scalars", "tag": "eval/loss"},
        ],
        run_colors={
            "train": "#2196F3",  # Blue
            "eval": "#4CAF50",   # Green
        },
        tag_filter="loss|accuracy",
        smoothing=0.8,
    )

    # Write the profile to the logdir
    profile_writer.write_profile(logdir, profile)

    # Or use the convenience function
    profile_writer.set_default_profile(
        logdir,
        pinned_cards=[{"plugin": "scalars", "tag": "train/loss"}],
        run_colors={"train": "#ff0000"},
        # Log scale for loss, linear for everything else
        tag_axis_scales={"train/loss": {"y": "log10"}},
    )
"""

from __future__ import annotations

import json
import os
import time
from typing import Literal, TypedDict

# ---------------------------------------------------------------------------
# Profile format version
# ---------------------------------------------------------------------------
PROFILE_VERSION = 1


# ---------------------------------------------------------------------------
# Axis scale types
# ---------------------------------------------------------------------------
AxisScale = Literal["linear", "log10", "symlog10"]
VALID_AXIS_SCALES: tuple[AxisScale, ...] = (
    "linear",
    "log10",
    "symlog10",
)


class TagAxisScale(TypedDict, total=False):
    """Per-axis scale override for a single tag.

    Both keys are optional; omitted axes keep the global default.
    """

    y: AxisScale
    x: AxisScale


# ---------------------------------------------------------------------------
# Typed structures for profile JSON fields
# ---------------------------------------------------------------------------
class _PinnedCardRequired(TypedDict):
    plugin: str
    tag: str


class PinnedCard(_PinnedCardRequired, total=False):
    """A card to pin at the top of the dashboard."""

    runId: str
    sample: int


class RunColorEntry(TypedDict):
    """Maps a single run to a hex colour."""

    runId: str
    color: str


class GroupColorEntry(TypedDict):
    """Maps a group key to a colour-palette index."""

    groupKey: str
    colorId: int


class SuperimposedCardEntry(TypedDict):
    """A card that overlays multiple scalar tags on one chart."""

    id: str
    title: str
    tags: list[str]
    runId: str | None


RunSelectionType = Literal["RUN_ID", "RUN_NAME"]


class RunSelectionEntry(TypedDict):
    """Declares whether a single run is visible."""

    type: RunSelectionType
    value: str
    selected: bool


GroupByKey = Literal["RUN", "EXPERIMENT", "REGEX", "REGEX_BY_EXP"]


class _GroupByRequired(TypedDict):
    key: GroupByKey


class GroupByConfig(_GroupByRequired, total=False):
    """Run-grouping configuration."""

    regexString: str


class _ProfileDataRequired(TypedDict):
    version: int
    name: str
    lastModifiedTimestamp: int
    pinnedCards: list[PinnedCard]
    runColors: list[RunColorEntry]
    groupColors: list[GroupColorEntry]
    superimposedCards: list[SuperimposedCardEntry]
    tagFilter: str
    runFilter: str
    smoothing: float


class ProfileData(_ProfileDataRequired, total=False):
    """The ``data`` payload inside a serialised profile."""

    runSelection: list[RunSelectionEntry]
    metricDescriptions: dict[str, str]
    groupBy: GroupByConfig | None
    yAxisScale: AxisScale
    xAxisScale: AxisScale
    tagAxisScales: dict[str, TagAxisScale]
    expandedTagGroups: dict[str, bool]


class SerializedProfile(TypedDict):
    """Top-level wrapper written to ``default_profile.json``."""

    version: int
    data: ProfileData


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def create_profile(
    name: str = "Default Profile",
    pinned_cards: list[PinnedCard] | None = None,
    run_colors: dict[str, str] | None = None,
    group_colors: list[GroupColorEntry] | None = None,
    superimposed_cards: list[SuperimposedCardEntry] | None = None,
    run_selection: list[RunSelectionEntry] | None = None,
    selected_runs: list[str] | None = None,
    metric_descriptions: dict[str, str] | None = None,
    tag_filter: str = "",
    run_filter: str = "",
    smoothing: float = 0.6,
    symlog_linear_threshold: float = 1.0,
    group_by: GroupByConfig | None = None,
    y_axis_scale: AxisScale | None = None,
    x_axis_scale: AxisScale | None = None,
    tag_axis_scales: dict[str, TagAxisScale] | None = None,
    tag_symlog_linear_thresholds: dict[str, float] | None = None,
    expanded_tag_groups: dict[str, bool] | None = None,
) -> SerializedProfile:
    """Create a TensorBoard profile dictionary.

    Args:
        name: User-friendly name for the profile.
        pinned_cards: Cards to pin at the top of the dashboard.
        run_colors: Mapping from run name/ID to hex colour string.
        group_colors: Group-key to colour-palette-index assignments.
        superimposed_cards: Multi-tag overlay card definitions.
        run_selection: Explicit run visibility entries.
        selected_runs: Convenience list of run names to select
            (converted to ``RunSelectionEntry`` with ``type="RUN_NAME"``
            and ``selected=True``).
        metric_descriptions: Long-form Markdown descriptions per tag.
        tag_filter: Regex pattern to filter tags.
        run_filter: Regex pattern to filter runs.
        smoothing: Scalar smoothing value (0.0 to 0.999).
        symlog_linear_threshold: Linear threshold for the symlog scale.
            Controls the width of the linear region near zero. Default 1.0.
        group_by: Run-grouping configuration.
        y_axis_scale: Global Y-axis scale for scalar plots.
        x_axis_scale: Global X-axis scale for scalar plots
            (STEP/RELATIVE only).
        tag_symlog_linear_thresholds: Per-tag symlog linear threshold
            overrides. Example: ``{"train/loss": 10.0}``
        tag_axis_scales: Per-tag axis scale overrides.  Example::

                {"train/loss": {"y": "log10"}}

        expanded_tag_groups: Which tag group sections to expand or
            collapse. Maps tag group names to booleans
            (``True`` = expanded, ``False`` = collapsed).
            When omitted, the dashboard uses its default behaviour
            (auto-expand the first two groups).  Example::

                {"train": True, "eval": True, "debug": False}

    Returns:
        A serialised profile ready to be written to the logdir.

    Raises:
        ValueError: If an invalid axis scale name is provided.
    """
    if y_axis_scale is not None and y_axis_scale not in VALID_AXIS_SCALES:
        raise ValueError(
            f"Invalid y_axis_scale: {y_axis_scale!r}. "
            f"Must be one of {VALID_AXIS_SCALES}"
        )
    if x_axis_scale is not None and x_axis_scale not in VALID_AXIS_SCALES:
        raise ValueError(
            f"Invalid x_axis_scale: {x_axis_scale!r}. "
            f"Must be one of {VALID_AXIS_SCALES}"
        )
    if tag_axis_scales is not None:
        for tag, axes in tag_axis_scales.items():
            for axis_key, scale in axes.items():
                if axis_key not in ("y", "x"):
                    raise ValueError(
                        f"Invalid axis key {axis_key!r} for tag "
                        f"{tag!r}. Must be 'y' or 'x'"
                    )
                if scale not in VALID_AXIS_SCALES:
                    raise ValueError(
                        f"Invalid scale {scale!r} for tag "
                        f"{tag!r} axis {axis_key!r}. "
                        f"Must be one of {VALID_AXIS_SCALES}"
                    )

    run_color_entries: list[RunColorEntry] = [
        RunColorEntry(runId=run_id, color=color)
        for run_id, color in (run_colors or {}).items()
    ]

    run_selection_entries = run_selection or []
    if not run_selection_entries and selected_runs:
        run_selection_entries = [
            RunSelectionEntry(type="RUN_NAME", value=run_name, selected=True)
            for run_name in selected_runs
        ]

    data = ProfileData(
        version=PROFILE_VERSION,
        name=name,
        lastModifiedTimestamp=int(time.time() * 1000),
        pinnedCards=pinned_cards or [],
        runColors=run_color_entries,
        groupColors=group_colors or [],
        superimposedCards=superimposed_cards or [],
        tagFilter=tag_filter,
        runFilter=run_filter,
        smoothing=smoothing,
    )
    if run_selection_entries:
        data["runSelection"] = run_selection_entries
    if metric_descriptions:
        data["metricDescriptions"] = metric_descriptions
    if group_by is not None:
        data["groupBy"] = group_by
    if y_axis_scale is not None:
        data["yAxisScale"] = y_axis_scale
    if x_axis_scale is not None:
        data["xAxisScale"] = x_axis_scale
    if tag_axis_scales:
        data["tagAxisScales"] = tag_axis_scales
    if symlog_linear_threshold != 1.0:
        data["symlogLinearThreshold"] = symlog_linear_threshold
    if tag_symlog_linear_thresholds:
        data["tagSymlogLinearThresholds"] = tag_symlog_linear_thresholds
    if expanded_tag_groups:
        data["expandedTagGroups"] = expanded_tag_groups

    return SerializedProfile(version=PROFILE_VERSION, data=data)


def write_profile(logdir: str, profile: SerializedProfile) -> str:
    """Write a profile to the logdir.

    The profile is written to
    ``<logdir>/.tensorboard/default_profile.json``.

    Args:
        logdir: The TensorBoard log directory.
        profile: A profile dict (from :func:`create_profile`).

    Returns:
        The path to the written profile file.
    """
    profile_dir = os.path.join(logdir, ".tensorboard")
    os.makedirs(profile_dir, exist_ok=True)

    profile_path = os.path.join(profile_dir, "default_profile.json")
    with open(profile_path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2)

    return profile_path


def read_profile(logdir: str) -> SerializedProfile | None:
    """Read the default profile from a logdir.

    Returns:
        The profile dictionary, or ``None`` if no profile exists.
    """
    profile_path = os.path.join(logdir, ".tensorboard", "default_profile.json")
    if not os.path.exists(profile_path):
        return None

    try:
        with open(profile_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def set_default_profile(
    logdir: str,
    name: str = "Default Profile",
    pinned_cards: list[PinnedCard] | None = None,
    run_colors: dict[str, str] | None = None,
    group_colors: list[GroupColorEntry] | None = None,
    superimposed_cards: list[SuperimposedCardEntry] | None = None,
    run_selection: list[RunSelectionEntry] | None = None,
    selected_runs: list[str] | None = None,
    metric_descriptions: dict[str, str] | None = None,
    tag_filter: str = "",
    run_filter: str = "",
    smoothing: float = 0.6,
    symlog_linear_threshold: float = 1.0,
    group_by: GroupByConfig | None = None,
    y_axis_scale: AxisScale | None = None,
    x_axis_scale: AxisScale | None = None,
    tag_axis_scales: dict[str, TagAxisScale] | None = None,
    tag_symlog_linear_thresholds: dict[str, float] | None = None,
    expanded_tag_groups: dict[str, bool] | None = None,
) -> str:
    """Create and write a profile in one call.

    All parameters are forwarded to :func:`create_profile`;
    see its docstring for details.

    Returns:
        The path to the written profile file.
    """
    profile = create_profile(
        name=name,
        pinned_cards=pinned_cards,
        run_colors=run_colors,
        group_colors=group_colors,
        superimposed_cards=superimposed_cards,
        run_selection=run_selection,
        selected_runs=selected_runs,
        metric_descriptions=metric_descriptions,
        tag_filter=tag_filter,
        run_filter=run_filter,
        smoothing=smoothing,
        symlog_linear_threshold=symlog_linear_threshold,
        group_by=group_by,
        y_axis_scale=y_axis_scale,
        x_axis_scale=x_axis_scale,
        tag_axis_scales=tag_axis_scales,
        tag_symlog_linear_thresholds=tag_symlog_linear_thresholds,
        expanded_tag_groups=expanded_tag_groups,
    )
    return write_profile(logdir, profile)


# ---------------------------------------------------------------------------
# Convenience helpers for building common card entries
# ---------------------------------------------------------------------------
def pin_scalar(tag: str) -> PinnedCard:
    """Create a pinned scalar card entry."""
    return PinnedCard(plugin="scalars", tag=tag)


def pin_histogram(tag: str, run_id: str) -> PinnedCard:
    """Create a pinned histogram card entry."""
    return PinnedCard(plugin="histograms", tag=tag, runId=run_id)


def pin_image(tag: str, run_id: str, sample: int = 0) -> PinnedCard:
    """Create a pinned image card entry."""
    return PinnedCard(plugin="images", tag=tag, runId=run_id, sample=sample)


_superimposed_card_counter = 0


def create_superimposed_card(
    title: str,
    tags: list[str],
    run_id: str | None = None,
) -> SuperimposedCardEntry:
    """Create a superimposed (multi-tag overlay) card entry."""
    global _superimposed_card_counter
    _superimposed_card_counter += 1
    return SuperimposedCardEntry(
        id=f"superimposed-{int(time.time() * 1000)}"
        f"-{_superimposed_card_counter}",
        title=title,
        tags=tags,
        runId=run_id,
    )
