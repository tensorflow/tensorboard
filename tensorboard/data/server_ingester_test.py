# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for `tensorboard.data.server_ingester`."""

import argparse
from unittest import mock

import grpc

from tensorboard import context
from tensorboard import ingester as ingester_lib
from tensorboard import test as tb_test
from tensorboard.data import server_ingester
from tensorboard.data import grpc_provider


def make_flags(**kwargs):
    kwargs.setdefault("grpc_data_provider", "")
    kwargs.setdefault("logdir", "")
    kwargs.setdefault("logdir_spec", "")
    kwargs.setdefault("load_fast", False)
    return argparse.Namespace(**kwargs)


class ServerDataIngesterTest(tb_test.TestCase):
    def setUp(self):
        super().setUp()
        self.enter_context(
            mock.patch.object(grpc, "insecure_channel", autospec=True)
        )

    def test_fixed_address(self):
        flags = make_flags(grpc_data_provider="localhost:6806")
        ingester = server_ingester.ServerDataIngester(flags)
        ingester.start()
        ctx = context.RequestContext()
        self.assertIsInstance(
            ingester.data_provider, grpc_provider.GrpcDataProvider
        )

    def test_empty_flags(self):
        flags = make_flags(logdir="/some/logdir")
        with self.assertRaises(ingester_lib.NotApplicableError):
            server_ingester.ServerDataIngester(flags)

    def test_load_fast(self):
        flags = make_flags(logdir="/some/logdir", load_fast=True)
        ingester = server_ingester.ServerDataIngester(flags)
        # Not much more that we can easily test here.


if __name__ == "__main__":
    tb_test.main()
