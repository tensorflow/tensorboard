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
"""Tests for dry-run rpc servicers."""


from tensorboard import test as tb_test
from tensorboard.uploader import dry_run_stubs
from tensorboard.uploader.proto import write_service_pb2


class DryRunTensorBoardWriterServicerTest(tb_test.TestCase):
    def setUp(self):
        super().setUp()
        self._stub = dry_run_stubs.DryRunTensorBoardWriterStub()

    def testCreateExperiment(self):
        self._stub.CreateExperiment(write_service_pb2.CreateExperimentRequest())

    def testWriteScalar(self):
        self._stub.WriteScalar(write_service_pb2.WriteScalarRequest())

    def testWriteTensor(self):
        self._stub.WriteTensor(write_service_pb2.WriteTensorRequest())

    def testGetOrCreateBlobSequence(self):
        self._stub.GetOrCreateBlobSequence(
            write_service_pb2.GetOrCreateBlobSequenceRequest()
        )

    def testWriteBlob(self):
        def dummy_iterator():
            yield write_service_pb2.WriteBlobRequest()
            yield write_service_pb2.WriteBlobRequest()

        for response in self._stub.WriteBlob(dummy_iterator()):
            self.assertTrue(response)


if __name__ == "__main__":
    tb_test.main()
