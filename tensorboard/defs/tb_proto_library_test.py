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
"""Tests for the `tb_proto_library` build macro."""


from tensorboard import test as tb_test
from tensorboard.defs import test_base_pb2
from tensorboard.defs import test_base_pb2_grpc
from tensorboard.defs import test_downstream_pb2
from tensorboard.defs import test_downstream_pb2_grpc


class TbProtoLibraryTest(tb_test.TestCase):
    """Tests for `tb_proto_library`."""

    def tests_with_deps(self):
        foo = test_base_pb2.Foo()
        foo.foo = 1
        bar = test_downstream_pb2.Bar()
        bar.foo.foo = 1
        self.assertEqual(foo, bar.foo)

    def test_service_deps(self):
        self.assertIsInstance(test_base_pb2_grpc.FooServiceServicer, type)
        self.assertIsInstance(test_downstream_pb2_grpc.BarServiceServicer, type)


if __name__ == "__main__":
    tb_test.main()
