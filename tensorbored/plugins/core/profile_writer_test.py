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
"""Tests for profile_writer module."""

import json
import os
import tempfile
import unittest

from tensorbored.plugins.core import profile_writer


class ProfileWriterTest(unittest.TestCase):
    def setUp(self):
        self.logdir = tempfile.mkdtemp()

    def test_create_profile_defaults(self):
        """Test create_profile with default values."""
        profile = profile_writer.create_profile()
        self.assertEqual(profile["version"], profile_writer.PROFILE_VERSION)
        self.assertEqual(profile["data"]["name"], "Default Profile")
        self.assertEqual(profile["data"]["pinnedCards"], [])
        self.assertEqual(profile["data"]["runColors"], [])
        self.assertNotIn("runSelection", profile["data"])
        self.assertNotIn("metricDescriptions", profile["data"])
        self.assertEqual(profile["data"]["tagFilter"], "")
        self.assertEqual(profile["data"]["smoothing"], 0.6)

    def test_create_profile_with_pinned_cards(self):
        """Test create_profile with pinned cards."""
        pinned = [
            {"plugin": "scalars", "tag": "loss"},
            {"plugin": "scalars", "tag": "accuracy"},
        ]
        profile = profile_writer.create_profile(pinned_cards=pinned)
        self.assertEqual(profile["data"]["pinnedCards"], pinned)

    def test_create_profile_with_run_colors(self):
        """Test create_profile converts run_colors dict to list format."""
        colors = {"run1": "#ff0000", "run2": "#00ff00"}
        profile = profile_writer.create_profile(run_colors=colors)

        run_colors = profile["data"]["runColors"]
        self.assertEqual(len(run_colors), 2)

        # Convert to dict for easier assertion
        color_dict = {entry["runId"]: entry["color"] for entry in run_colors}
        self.assertEqual(color_dict["run1"], "#ff0000")
        self.assertEqual(color_dict["run2"], "#00ff00")

    def test_create_profile_with_all_options(self):
        """Test create_profile with all options."""
        profile = profile_writer.create_profile(
            name="My Dashboard",
            pinned_cards=[{"plugin": "scalars", "tag": "loss"}],
            run_colors={"train": "#0000ff"},
            selected_runs=["train", "eval"],
            metric_descriptions={
                "train/loss": "The loss used to optimize the model.",
            },
            tag_filter="train.*",
            run_filter="exp1",
            smoothing=0.9,
            group_by={"key": "REGEX", "regexString": "(.*)_train"},
        )

        data = profile["data"]
        self.assertEqual(data["name"], "My Dashboard")
        self.assertEqual(len(data["pinnedCards"]), 1)
        self.assertEqual(len(data["runColors"]), 1)
        self.assertEqual(
            data["runSelection"],
            [
                {"type": "RUN_NAME", "value": "train", "selected": True},
                {"type": "RUN_NAME", "value": "eval", "selected": True},
            ],
        )
        self.assertEqual(
            data["metricDescriptions"]["train/loss"],
            "The loss used to optimize the model.",
        )
        self.assertEqual(data["tagFilter"], "train.*")
        self.assertEqual(data["runFilter"], "exp1")
        self.assertEqual(data["smoothing"], 0.9)
        self.assertEqual(data["groupBy"]["key"], "REGEX")

    def test_write_profile(self):
        """Test write_profile creates the profile file."""
        profile = profile_writer.create_profile(name="Test")
        path = profile_writer.write_profile(self.logdir, profile)

        self.assertTrue(os.path.exists(path))
        self.assertTrue(path.endswith("default_profile.json"))

        with open(path, "r") as f:
            saved = json.load(f)
        self.assertEqual(saved["data"]["name"], "Test")

    def test_write_profile_creates_directory(self):
        """Test write_profile creates .tensorboard directory if needed."""
        profile = profile_writer.create_profile()
        profile_writer.write_profile(self.logdir, profile)

        tb_dir = os.path.join(self.logdir, ".tensorboard")
        self.assertTrue(os.path.isdir(tb_dir))

    def test_read_profile(self):
        """Test read_profile reads back written profile."""
        profile = profile_writer.create_profile(name="Read Test")
        profile_writer.write_profile(self.logdir, profile)

        loaded = profile_writer.read_profile(self.logdir)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["data"]["name"], "Read Test")

    def test_read_profile_returns_none_when_missing(self):
        """Test read_profile returns None when no profile exists."""
        loaded = profile_writer.read_profile(self.logdir)
        self.assertIsNone(loaded)

    def test_set_default_profile(self):
        """Test set_default_profile convenience function."""
        path = profile_writer.set_default_profile(
            self.logdir,
            name="Quick Setup",
            pinned_cards=[{"plugin": "scalars", "tag": "loss"}],
            run_colors={"train": "#ff0000"},
            smoothing=0.75,
        )

        self.assertTrue(os.path.exists(path))

        loaded = profile_writer.read_profile(self.logdir)
        self.assertEqual(loaded["data"]["name"], "Quick Setup")
        self.assertEqual(loaded["data"]["smoothing"], 0.75)

    def test_pin_scalar_helper(self):
        """Test pin_scalar helper function."""
        card = profile_writer.pin_scalar("train/loss")
        self.assertEqual(card, {"plugin": "scalars", "tag": "train/loss"})

    def test_pin_histogram_helper(self):
        """Test pin_histogram helper function."""
        card = profile_writer.pin_histogram("weights", "run1")
        self.assertEqual(
            card, {"plugin": "histograms", "tag": "weights", "runId": "run1"}
        )

    def test_pin_image_helper(self):
        """Test pin_image helper function."""
        card = profile_writer.pin_image("images/input", "run1", sample=2)
        self.assertEqual(
            card,
            {
                "plugin": "images",
                "tag": "images/input",
                "runId": "run1",
                "sample": 2,
            },
        )

    def test_create_superimposed_card_helper(self):
        """Test create_superimposed_card helper function."""
        card = profile_writer.create_superimposed_card(
            title="Train vs Eval Loss",
            tags=["train/loss", "eval/loss"],
        )
        self.assertEqual(card["title"], "Train vs Eval Loss")
        self.assertEqual(card["tags"], ["train/loss", "eval/loss"])
        self.assertIsNone(card["runId"])
        self.assertIn("id", card)

    def test_create_superimposed_card_unique_ids(self):
        """Test that multiple superimposed cards get unique IDs."""
        card1 = profile_writer.create_superimposed_card(
            title="Card A",
            tags=["loss/train", "loss/eval"],
        )
        card2 = profile_writer.create_superimposed_card(
            title="Card B",
            tags=["accuracy/train", "accuracy/eval"],
        )
        self.assertNotEqual(card1["id"], card2["id"])

    def test_create_profile_with_axis_scales(self):
        """Test create_profile with axis scale settings."""
        profile = profile_writer.create_profile(
            y_axis_scale="log10",
            x_axis_scale="symlog10",
        )
        data = profile["data"]
        self.assertEqual(data["yAxisScale"], "log10")
        self.assertEqual(data["xAxisScale"], "symlog10")

    def test_create_profile_omits_axis_scales_when_none(self):
        """Test create_profile omits axis scale fields when None."""
        profile = profile_writer.create_profile()
        data = profile["data"]
        self.assertNotIn("yAxisScale", data)
        self.assertNotIn("xAxisScale", data)

    def test_create_profile_invalid_y_axis_scale(self):
        """Test create_profile raises for invalid Y axis scale."""
        with self.assertRaises(ValueError):
            profile_writer.create_profile(y_axis_scale="invalid")

    def test_create_profile_invalid_x_axis_scale(self):
        """Test create_profile raises for invalid X axis scale."""
        with self.assertRaises(ValueError):
            profile_writer.create_profile(x_axis_scale="quadratic")

    def test_set_default_profile_with_axis_scales(self):
        """Test set_default_profile passes axis scales through."""
        path = profile_writer.set_default_profile(
            self.logdir,
            y_axis_scale="log10",
            x_axis_scale="symlog10",
        )
        loaded = profile_writer.read_profile(self.logdir)
        self.assertEqual(loaded["data"]["yAxisScale"], "log10")
        self.assertEqual(loaded["data"]["xAxisScale"], "symlog10")

    def test_create_profile_with_tag_axis_scales(self):
        """Test create_profile with per-tag axis scales."""
        profile = profile_writer.create_profile(
            tag_axis_scales={
                "train/loss": {"y": "log10"},
                "eval/loss": {"y": "log10", "x": "symlog10"},
            },
        )
        data = profile["data"]
        self.assertEqual(data["tagAxisScales"]["train/loss"], {"y": "log10"})
        self.assertEqual(
            data["tagAxisScales"]["eval/loss"],
            {"y": "log10", "x": "symlog10"},
        )

    def test_create_profile_invalid_tag_axis_scale(self):
        """Test create_profile raises for invalid per-tag axis scale."""
        with self.assertRaises(ValueError):
            profile_writer.create_profile(
                tag_axis_scales={"loss": {"y": "cubic"}}
            )

    def test_create_profile_invalid_tag_axis_key(self):
        """Test create_profile raises for invalid axis key."""
        with self.assertRaises(ValueError):
            profile_writer.create_profile(
                tag_axis_scales={"loss": {"z": "log10"}}
            )

    def test_create_profile_with_expanded_tag_groups(self):
        """Test create_profile with expanded_tag_groups."""
        profile = profile_writer.create_profile(
            expanded_tag_groups={"train": True, "eval": True, "debug": False},
        )
        data = profile["data"]
        self.assertEqual(
            data["expandedTagGroups"],
            {"train": True, "eval": True, "debug": False},
        )

    def test_create_profile_omits_expanded_tag_groups_when_none(self):
        """Test create_profile omits expandedTagGroups when not provided."""
        profile = profile_writer.create_profile()
        data = profile["data"]
        self.assertNotIn("expandedTagGroups", data)

    def test_create_profile_omits_expanded_tag_groups_when_empty(self):
        """Test create_profile omits expandedTagGroups when empty dict."""
        profile = profile_writer.create_profile(expanded_tag_groups={})
        data = profile["data"]
        self.assertNotIn("expandedTagGroups", data)

    def test_set_default_profile_with_expanded_tag_groups(self):
        """Test set_default_profile passes expanded_tag_groups through."""
        path = profile_writer.set_default_profile(
            self.logdir,
            expanded_tag_groups={"train": True, "eval": False},
        )
        loaded = profile_writer.read_profile(self.logdir)
        self.assertEqual(
            loaded["data"]["expandedTagGroups"],
            {"train": True, "eval": False},
        )


class IntegrationTest(unittest.TestCase):
    """Integration tests demonstrating typical usage."""

    def setUp(self):
        self.logdir = tempfile.mkdtemp()

    def test_typical_training_setup(self):
        """Test a typical training script setup."""
        # This is what a user's training script might look like
        profile_writer.set_default_profile(
            self.logdir,
            name="Training Dashboard",
            pinned_cards=[
                profile_writer.pin_scalar("train/loss"),
                profile_writer.pin_scalar("train/accuracy"),
                profile_writer.pin_scalar("eval/loss"),
            ],
            run_colors={
                "train": "#2196F3",  # Blue
                "eval": "#4CAF50",  # Green
            },
            tag_filter="loss|accuracy",
            smoothing=0.8,
        )

        # Verify profile was written correctly
        loaded = profile_writer.read_profile(self.logdir)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["data"]["name"], "Training Dashboard")
        self.assertEqual(len(loaded["data"]["pinnedCards"]), 3)
        self.assertEqual(len(loaded["data"]["runColors"]), 2)

    def test_superimposed_cards_setup(self):
        """Test setting up superimposed cards."""
        profile_writer.set_default_profile(
            self.logdir,
            name="Combined Metrics",
            pinned_cards=[profile_writer.pin_scalar("train/loss")],
            superimposed_cards=[
                profile_writer.create_superimposed_card(
                    title="Loss Comparison",
                    tags=["train/loss", "eval/loss", "test/loss"],
                ),
                profile_writer.create_superimposed_card(
                    title="Accuracy Comparison",
                    tags=["train/accuracy", "eval/accuracy"],
                ),
            ],
        )

        loaded = profile_writer.read_profile(self.logdir)
        self.assertEqual(len(loaded["data"]["superimposedCards"]), 2)
        self.assertEqual(
            loaded["data"]["superimposedCards"][0]["title"], "Loss Comparison"
        )


if __name__ == "__main__":
    unittest.main()
