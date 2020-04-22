# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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
"""TensorBoard main module.

This module ties together `tensorboard.program` and
`tensorboard.default_plugins` to provide standard TensorBoard. It's
meant to be tiny and act as little other than a config file. Those
wishing to customize the set of plugins or static assets that
TensorBoard uses can swap out this file with their own.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


import os

# TF versions prior to 1.15.0 included default GCS filesystem caching logic
# that interacted pathologically with the pattern of reads used by TensorBoard
# for logdirs. See: https://github.com/tensorflow/tensorboard/issues/1225
# The problematic behavior was fixed in 1.15.0 by
# https://github.com/tensorflow/tensorflow/commit/e43b94649d3e1ac5d538e4eca9166b899511d681
# but for older versions of TF, we avoid a regression by setting this env var to
# disable the cache, which must be done before the first import of tensorflow.
os.environ["GCS_READ_CACHE_DISABLED"] = "1"


import sys

from tensorboard import default
from tensorboard import program
from tensorboard.compat import tf
from tensorboard.plugins import base_plugin
from tensorboard.uploader import uploader_subcommand
from tensorboard.util import tb_logging


logger = tb_logging.get_logger()


def run_main():
    """Initializes flags and calls main()."""
    program.setup_environment()

    if getattr(tf, "__version__", "stub") == "stub":
        print(
            "TensorFlow installation not found - running with reduced feature set.",
            file=sys.stderr,
        )

    tensorboard = program.TensorBoard(
        default.get_plugins() + default.get_dynamic_plugins(),
        program.get_default_assets_zip_provider(),
        subcommands=[uploader_subcommand.UploaderSubcommand()],
    )
    try:
        from absl import app

        # Import this to check that app.run() will accept the flags_parser argument.
        from absl.flags import argparse_flags

        app.run(tensorboard.main, flags_parser=tensorboard.configure)
        raise AssertionError("absl.app.run() shouldn't return")
    except ImportError:
        pass
    except base_plugin.FlagsError as e:
        print("Error: %s" % e, file=sys.stderr)
        sys.exit(1)

    tensorboard.configure(sys.argv)
    sys.exit(tensorboard.main())


if __name__ == "__main__":
    run_main()
