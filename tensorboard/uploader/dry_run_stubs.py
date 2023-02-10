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
"""Dry-run stubs for various rpc services."""


from tensorboard.uploader.proto import write_service_pb2


class DryRunTensorBoardWriterStub:
    """A dry-run TensorBoardWriter gRPC Server.

    Only the methods used by the `tensorboard dev upload` are
    mocked out in this class.

    When additional methods start to be used by the command,
    their mocks should be added to this class.
    """

    def CreateExperiment(self, request, **kwargs):
        """Create a new experiment and remember it has been created."""
        del request, kwargs  # Unused.
        return write_service_pb2.CreateExperimentResponse()

    def WriteScalar(self, request, **kwargs):
        del request, kwargs  # Unused.
        return write_service_pb2.WriteScalarResponse()

    def WriteTensor(self, request, **kwargs):
        del request, kwargs  # Unused.
        return write_service_pb2.WriteTensorResponse()

    def GetOrCreateBlobSequence(self, request, **kwargs):
        del request, kwargs  # Unused.
        return write_service_pb2.GetOrCreateBlobSequenceResponse(
            blob_sequence_id="dummy_blob_sequence_id"
        )

    def WriteBlob(self, request, **kwargs):
        del kwargs  # Unused.
        for item in request:
            yield write_service_pb2.WriteBlobResponse()
