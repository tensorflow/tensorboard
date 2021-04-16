# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Assists in bundling requests within a certain byte limit."""

# Maximum length of a base-128 varint as used to encode a 64-bit value
# (without the "msb of last byte is bit 63" optimization, to be
# compatible with protobuf and golang varints).
_MAX_VARINT64_LENGTH_BYTES = 10


class OutOfSpaceError(Exception):
    """Action could not proceed without overflowing request budget.

    This is a signaling exception (like `StopIteration`) used
    by `*RequestSender`; it does not mean that anything has gone wrong.
    """

    pass


def _varint_cost(n):
    """Computes the size of `n` encoded as an unsigned base-128 varint.

    This should be consistent with the proto wire format:
    <https://developers.google.com/protocol-buffers/docs/encoding#varints>

    Args:
      n: A non-negative integer.

    Returns:
      An integer number of bytes.
    """
    result = 1
    while n >= 128:
        result += 1
        n >>= 7
    return result


class ByteBudgetManager(object):
    """Manages the request byte budget for certain RPCs.

    This should be used for RPCs that organize data by Runs, Tags, and Points,
    specifically WriteScalar and WriteTensor.

    Any call to add_run(), add_tag(), or add_point() may raise an
    OutOfSpaceError, which is non-fatal. It signals to the caller that they
    should flush the current request and begin a new one.

    For more information on the protocol buffer encoding and how byte cost
    can be calculated, visit:

    https://developers.google.com/protocol-buffers/docs/encoding
    """

    def __init__(self, max_bytes):
        # The remaining number of bytes that we may yet add to the request.
        self._byte_budget = None  # type: int
        self._max_bytes = max_bytes

    def _remaining_budget(self):
        """How many bytes remain in the budget.  Used for testing."""
        return self._byte_budget

    def reset(self, base_request):
        """Resets the byte budget and calculates the cost of the base request.

        Args:
          base_request: A proto request, such as a WriteScalarRequest proto
            which will be used to determine the starting size.

        Raises:
          OutOfSpaceError: If the size of the request exceeds the entire
            request byte budget.
        """
        self._byte_budget = self._max_bytes
        self._byte_budget -= base_request.ByteSize()
        if self._byte_budget < 0:
            raise RuntimeError("Byte budget too small for base request")

    def add_run(self, run_proto):
        """Integrates the cost of a run proto into the byte budget.

        Args:
          run_proto: The proto representing a run.

        Raises:
          OutOfSpaceError: If adding the run would exceed the remaining request
            budget.
        """
        cost = (
            # The size of the run proto without any tag fields set.
            run_proto.ByteSize()
            # The size of the varint that describes the length of the run
            # proto. We can't yet know the final size of the run proto -- we
            # haven't yet set any tag or point values -- so we can't know the
            # final size of this length varint. We conservatively assume it is
            # maximum size.
            + _MAX_VARINT64_LENGTH_BYTES
            # The size of the proto key.
            + 1
        )
        if cost > self._byte_budget:
            raise OutOfSpaceError()
        self._byte_budget -= cost

    def add_tag(self, tag_proto):
        """Integrates the cost of a tag proto into the byte budget.

        Args:
          tag_proto: The proto representing a tag.

        Raises:
          OutOfSpaceError: If adding the tag would exceed the remaining request
           budget.
        """
        cost = (
            # The size of the tag proto without any tag fields set.
            tag_proto.ByteSize()
            # The size of the varint that describes the length of the tag
            # proto. We can't yet know the final size of the tag proto -- we
            # haven't yet set any point values -- so we can't know the final
            # size of this length varint. We conservatively assume it is maximum
            # size.
            + _MAX_VARINT64_LENGTH_BYTES
            # The size of the proto key.
            + 1
        )
        if cost > self._byte_budget:
            raise OutOfSpaceError()
        self._byte_budget -= cost

    def add_point(self, point_proto):
        """Integrates the cost of a point proto into the byte budget.

        Args:
          point_proto: The proto representing a point.

        Raises:
          OutOfSpaceError: If adding the point would exceed the remaining request
           budget.
        """
        submessage_cost = point_proto.ByteSize()
        cost = (
            # The size of the point proto.
            submessage_cost
            # The size of the varint that describes the length of the point
            # proto.
            + _varint_cost(submessage_cost)
            # The size of the proto key.
            + 1
        )
        if cost > self._byte_budget:
            raise OutOfSpaceError()
        self._byte_budget -= cost
