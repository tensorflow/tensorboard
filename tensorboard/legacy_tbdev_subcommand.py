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
# ==============================================================================
"""Legacy `tensorboard dev` implementation to print shutdown info."""

import sys

from tensorboard import program


_SHUTDOWN_MESSAGE = """\
======================================================================
ERROR: This command is no longer operational and will be removed.

TensorBoard.dev has been shut down. For further information,
see the FAQ at <https://tensorboard.dev/>.
======================================================================
"""


class LegacyTbdevSubcommand(program.TensorBoardSubcommand):
    """Legacy `tensorboard dev` implementation to print shutdown info."""

    def name(self):
        return "dev"

    def define_flags(self, parser):
        pass  # no flags to define

    def run(self, flags):
        sys.stderr.write(_SHUTDOWN_MESSAGE)
        sys.stderr.flush()
        sys.exit(1)

    def help(self):
        return ""  # omit help to avoid suggesting users should try it
