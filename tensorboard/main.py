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

# pylint: disable=g-import-not-at-top
# Disable the TF GCS filesystem cache which interacts pathologically with the
# pattern of reads used by TensorBoard for logdirs. See for details:
#   https://github.com/tensorflow/tensorboard/issues/1225
# This must be set before the first import of tensorflow.
import os
os.environ['GCS_READ_CACHE_DISABLED'] = '1'
# pylint: enable=g-import-not-at-top

import logging
import sys

from tensorboard import default
from tensorboard import program

logger = logging.getLogger(__name__)


def run_main():
  """Initializes flags and calls main()."""
  program.setup_environment()
  server = program.TensorBoard(default.PLUGIN_LOADERS,
                               default.get_assets_zip_provider())
  server.configure(sys.argv[1:])
  try:
    from absl import app
    app.run(server.main, sys.argv[:1] + server.unparsed_argv)
    raise AssertionError("absl.app.run() shouldn't return")
  except ImportError:
    pass
  if server.unparsed_argv:
    sys.stderr.write('Unknown flags: %s\nPass --help for help.\n' %
                     (server.unparsed_argv,))
    sys.exit(1)
  sys.exit(server.main())


if __name__ == '__main__':
  run_main()
