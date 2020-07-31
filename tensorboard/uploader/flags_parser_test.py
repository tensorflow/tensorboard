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
"""Tests for tensorboard.uploader.flags_parser."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


from absl.flags import argparse_flags

from tensorboard.uploader import flags_parser
from tensorboard import test as tb_test


def _define_and_parse_flags(argv):
    """Defines and parses flags.

    Creates an `ArgumentParser`, defines flags on the parser (the logic really
    being tested), and parses given arguments.

    Args:
      argv: CLI arguments, as with `sys.argv`, where the first argument is taken
        to be the name of the program being executed.
    """
    parser = argparse_flags.ArgumentParser(
        prog="uploader",
        description=("Upload your TensorBoard experiments to TensorBoard.dev"),
    )
    flags_parser.define_flags(parser)
    return parser.parse_args(argv[1:])


class FlagsParserTest(tb_test.TestCase):
    def test_unknown_command(self):
        with self.assertRaises(SystemExit):
            _define_and_parse_flags(["uploader", "unknown"])

    def test_list(self):
        flags = _define_and_parse_flags(["uploader", "list"])
        self.assertEqual(
            flags_parser.SUBCOMMAND_KEY_LIST,
            getattr(flags, flags_parser.SUBCOMMAND_FLAG),
        )

    def test_upload_logdir(self):
        flags = _define_and_parse_flags(
            ["uploader", "upload", "--logdir", "some/log/dir"]
        )
        self.assertEqual(
            flags_parser.SUBCOMMAND_KEY_UPLOAD,
            getattr(flags, flags_parser.SUBCOMMAND_FLAG),
        )
        self.assertEqual("some/log/dir", flags.logdir)

    def test_upload_with_plugins(self):
        flags = _define_and_parse_flags(
            ["uploader", "upload", "--plugins", "plugin1,plugin2"]
        )
        self.assertEqual(
            flags_parser.SUBCOMMAND_KEY_UPLOAD,
            getattr(flags, flags_parser.SUBCOMMAND_FLAG),
        )
        self.assertEqual(["plugin1", "plugin2"], flags.plugins)


if __name__ == "__main__":
    tb_test.main()
