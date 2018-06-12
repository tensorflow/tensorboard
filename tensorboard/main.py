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

import argparse
import functools
import logging
import sys

from tensorboard import default

logger = logging.getLogger(__name__)


def run_main():
  """Initializes flags and calls main()."""
  try:
    from absl import app
  except ImportError:
    app = None
  program.setup_environment()
  assets = default.get_assets_zip_provider()
  loaders = default.PLUGIN_LOADERS
  parser = argparse.ArgumentParser(
      prog='tensorboard',
      description=('TensorBoard is a suite of web applications for '
                   'inspecting and understanding your TensorFlow runs '
                   'and graphs. https://github.com/tensorflow/tensorboard'))
  for loader in loaders:
    loader.define_flags(parser)
  if app is None:
    flags, unparsed = parser.parse_args()
  else:
    flags, unparsed = parser.parse_known_args()
  for loader in loaders:
    loader.fix_flags(flags)
  main = functools.partial(program.main, loaders, assets, flags)
  if app is None:
    sys.exit(main(unparsed))
  else:
    app.run(main, sys.argv[:1] + unparsed)


if __name__ == '__main__':
  run_main()
