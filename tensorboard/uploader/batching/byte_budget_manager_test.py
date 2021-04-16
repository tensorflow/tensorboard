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
"""Tests for tensorboard.uploader.batching.byte_budget_manager."""

from tensorboard import test as tb_test

from tensorboard.uploader.batching import byte_budget_manager
from tensorboard.uploader.proto import write_service_pb2

class ByteBudgetManagerTest(tb_test.TestCase):

    def test_reset_subtracts_base_request(self):
        # Setup: a ByteBudgetManager with a budget.
        max_request_size = 128 * (2 ** 10)  # 128KiB
        mgr = byte_budget_manager.ByteBudgetManager(max_request_size)
        # Execute: `reset` with a non-empty WriteScalarRequest.
        base_request = write_service_pb2.WriteScalarRequest()
        base_request.experiment_id = "abcd1234"
        mgr.reset(base_request)
        remaining_budget = mgr._remaining_budget()
        # Expect: that the remaining budget is less than the full budget.
        self.assertLess(remaining_budget, max_request_size)

    def test_counts_points_bytes(self):
       # Setup: a ByteBudgetManager with a budget.
        max_request_size = 128 * (2 ** 10)  # 128KiB
        mgr = byte_budget_manager.ByteBudgetManager(max_request_size)
        mgr.reset(write_service_pb2.WriteScalarRequest())
        # Execute: `add_point` with a non-empty point
        write_request_proto = write_service_pb2.WriteScalarRequest()
        run_proto = write_request_proto.runs.add(name="run_name")
        tag_proto = run_proto.tags.add(name="tag_name")
        point_proto = tag_proto.points.add()
        starting_budget = mgr._remaining_budget()
        mgr.add_point(point_proto)
        ending_budget = mgr._remaining_budget()
        # Expect that adding the point reduced the remaining budget.
        self.assertLess(ending_budget, starting_budget)

    def test_counts_tags_bytes(self):
       # Setup: a ByteBudgetManager with a budget.
        max_request_size = 128 * (2 ** 10)  # 128KiB
        mgr = byte_budget_manager.ByteBudgetManager(max_request_size)
        mgr.reset(write_service_pb2.WriteScalarRequest())
        # Execute: `add_tag` with a non-empty tag
        write_request_proto = write_service_pb2.WriteScalarRequest()
        run_proto = write_request_proto.runs.add(name="run_name")
        tag_proto = run_proto.tags.add(name="tag_name")
        starting_budget = mgr._remaining_budget()
        mgr.add_tag(tag_proto)
        ending_budget = mgr._remaining_budget()
        # Expect that adding the point reduced the remaining budget.
        self.assertLess(ending_budget, starting_budget)

    def test_counts_runs_bytes(self):
       # Setup: a ByteBudgetManager with a budget.
        max_request_size = 128 * (2 ** 10)  # 128KiB
        mgr = byte_budget_manager.ByteBudgetManager(max_request_size)
        mgr.reset(write_service_pb2.WriteScalarRequest())
        # Execute: `add_run` with a non-empty run
        write_request_proto = write_service_pb2.WriteScalarRequest()
        run_proto = write_request_proto.runs.add(name="run_name")
        starting_budget = mgr._remaining_budget()
        mgr.add_run(run_proto)
        ending_budget = mgr._remaining_budget()
        # Expect that adding the run reduced the remaining budget.
        self.assertLess(ending_budget, starting_budget)

    def test_overrunning_budget_raises_out_of_space_error(self):
       # Setup: a ByteBudgetManager with a very small budget.
        max_request_size = 128  # 128B
        mgr = byte_budget_manager.ByteBudgetManager(max_request_size)
        mgr.reset(write_service_pb2.WriteScalarRequest())
        # Execute: `add_run` with a very big run name.
        big_run_name = "R" * 1000
        big_tag_name = "T" * 1000
        write_request_proto = write_service_pb2.WriteScalarRequest()
        run_proto = write_request_proto.runs.add(name=big_run_name)
        tag_proto = run_proto.tags.add(name=big_tag_name)
        starting_budget = mgr._remaining_budget()
        with self.assertRaises(byte_budget_manager.OutOfSpaceError) as cm:
            mgr.add_run(run_proto)
        with self.assertRaises(byte_budget_manager.OutOfSpaceError) as cm:
            mgr.add_tag(tag_proto)
        ending_budget = mgr._remaining_budget()
        # Expect that the remaining budget was unchanged.
        self.assertEqual(ending_budget, starting_budget)


if __name__ == "__main__":
    tb_test.main()
