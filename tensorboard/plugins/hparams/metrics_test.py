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
"""Tests for the hparams plugin's `metrics` module."""

import ntpath
import posixpath
from unittest import mock

from tensorboard import test as tb_test
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import metrics


def _metric(group, tag):
    return api_pb2.MetricName(group=group, tag=tag)


class RunTagFromSessionAndMetricTest(tb_test.TestCase):
    def _run_tag(self, path_module, session_name, group, tag):
        # Run names are built with the separator of the platform the logdir is
        # read on, so a Windows run is "Model001\train" and a POSIX run is
        # "Model001/train". Patching `os` lets both be checked on one machine.
        with mock.patch.object(
            metrics.os, "path", path_module
        ), mock.patch.object(metrics.os, "sep", path_module.sep):
            return metrics.run_tag_from_session_and_metric(
                session_name, _metric(group, tag)
            )

    def test_empty_group_posix(self):
        self.assertEqual(
            ("Model001", "loss"),
            self._run_tag(posixpath, "Model001", "", "loss"),
        )

    def test_empty_group_windows(self):
        self.assertEqual(
            ("Model001", "loss"),
            self._run_tag(ntpath, "Model001", "", "loss"),
        )

    def test_empty_group_windows_nested_session(self):
        self.assertEqual(
            ("logs\\Model001", "loss"),
            self._run_tag(ntpath, "logs\\Model001", "", "loss"),
        )

    def test_empty_group_session_with_trailing_forward_slash(self):
        self.assertEqual(
            ("gs://bucket/Model001", "loss"),
            self._run_tag(ntpath, "gs://bucket/Model001/", "", "loss"),
        )

    def test_group_is_joined_posix(self):
        self.assertEqual(
            ("Model001/train", "loss"),
            self._run_tag(posixpath, "Model001", "train", "loss"),
        )

    def test_group_is_joined_windows(self):
        self.assertEqual(
            ("Model001\\train", "loss"),
            self._run_tag(ntpath, "Model001", "train", "loss"),
        )


if __name__ == "__main__":
    tb_test.main()
