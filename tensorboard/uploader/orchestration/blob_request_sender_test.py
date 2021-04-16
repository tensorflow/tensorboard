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
"""Tests for tensorboard.uploader.batching.tensor_batched_request_sender"""


import itertools
import os
import re
from unittest import mock

import grpc
import grpc_testing

import tensorflow as tf

from tensorboard import data_compat
from tensorboard import dataclass_compat
from tensorboard.compat.proto import tensor_shape_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.uploader.orchestration import tensor_batched_request_sender
from tensorboard.uploader import test_util
from tensorboard.uploader import upload_tracker
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.compat.proto import tensor_pb2
from tensorboard.compat.proto import types_pb2
from tensorboard.plugins.histogram import summary_v2 as histogram_v2
from tensorboard.summary import v1 as summary_v1
from tensorboard.util import tensor_util


class BlobRequestSenderTest(tf.test.TestCase):
    def test_add_tests_here(self):
        self.assertEqual(2, 1+1)


if __name__ == "__main__":
    tf.test.main()