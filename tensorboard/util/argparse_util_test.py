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
"""Tests for `argparse_util`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse

from tensorboard import test as tb_test
from tensorboard.util import argparse_util


class AllowMissingSubcommandTest(tb_test.TestCase):

  def test_allows_missing_subcommands(self):
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers()
    subparser = subparsers.add_parser("magic")
    subparser.set_defaults(chosen="magic")
    with argparse_util.allow_missing_subcommand():
      args = parser.parse_args([])
    self.assertEqual(args, argparse.Namespace())

  def test_allows_provided_subcommands(self):
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers()
    subparser = subparsers.add_parser("magic")
    subparser.set_defaults(chosen="magic")
    with argparse_util.allow_missing_subcommand():
      args = parser.parse_args(["magic"])
    self.assertEqual(args, argparse.Namespace(chosen="magic"))

  def test_still_complains_on_missing_arguments(self):
    parser = argparse.ArgumentParser()
    parser.add_argument("please_provide_me")
    with argparse_util.allow_missing_subcommand():
      with self.assertRaises(SystemExit):
        parser.parse_args([])


if __name__ == "__main__":
  tb_test.main()
