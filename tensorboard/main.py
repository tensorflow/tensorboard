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

import tensorflow as tf

from tensorboard import default
from tensorboard import program


def run_main():
  """Initializes flags and calls main()."""
  tf.app.run(main)


def main(unused_argv=None):
  """Standard TensorBoard program CLI.

  See `tensorboard.program.main` for further documentation.
  """
  return program.main(default.get_plugins(),
                      default.get_assets_zip_provider())


def create_tb_app(*args, **kwargs):
  tf.logging.warning('DEPRECATED API: create_tb_app() should now be accessed '
                     'via the `tensorboard.program` module')
  return program.create_tb_app(*args, **kwargs)


def make_simple_server(*args, **kwargs):
  tf.logging.warning('DEPRECATED API: make_simple_server() should now be '
                     'accessed via the `tensorboard.program` module')
  return program.make_simple_server(*args, **kwargs)


def run_simple_server(*args, **kwargs):
  tf.logging.warning('DEPRECATED API: run_simple_server() should now be '
                     'accessed via the `tensorboard.program` module')
  return program.run_simple_server(*args, **kwargs)


if __name__ == '__main__':
  run_main()
