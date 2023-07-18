# Copyright 2023 The TensorFlow Authors. All Rights Reserved.
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

from absl.testing import absltest
from google.protobuf import struct_pb2
from tensorboard.plugins.hparams import json_format_compat


class TestCase(absltest.TestCase):
    def test_real_value_is_serializable(self):
        self.assertTrue(
            json_format_compat.is_serializable_value(
                struct_pb2.Value(number_value=1.0)
            )
        )
        self.assertTrue(
            json_format_compat.is_serializable_value(
                struct_pb2.Value(string_value="nan")
            )
        )
        self.assertTrue(
            json_format_compat.is_serializable_value(
                struct_pb2.Value(bool_value=False)
            )
        )

    def test_empty_value_is_serializable(self):
        self.assertTrue(
            json_format_compat.is_serializable_value(struct_pb2.Value())
        )

    def test_nan_value_is_not_serializable(self):
        self.assertFalse(
            json_format_compat.is_serializable_value(
                struct_pb2.Value(number_value=float("nan"))
            )
        )

    def test_infinity_value_is_not_serializable(self):
        self.assertFalse(
            json_format_compat.is_serializable_value(
                struct_pb2.Value(number_value=float("inf"))
            )
        )
        self.assertFalse(
            json_format_compat.is_serializable_value(
                struct_pb2.Value(number_value=float("-inf"))
            )
        )


if __name__ == "__main__":
    absltest.main()
