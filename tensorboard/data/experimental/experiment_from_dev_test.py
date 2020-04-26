# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for tensorboard.uploader.exporter."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import errno
import json
import os

import grpc
import grpc_testing

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import

from tensorboard import test as tb_test
from tensorboard.data.experimental import experiment_from_dev


class ExperimentFromDevTest(tb_test.TestCase):
    def test_experiment_from_dev_get_scalars(self):
        experiment_id = "AdYd1TgeTlaLWXx6I8JUbA"
        experiment = experiment_from_dev.ExperimentFromDev(experiment_id)
        print(experiment.get_scalars())  # DEBUG


if __name__ == "__main__":
    tb_test.main()
