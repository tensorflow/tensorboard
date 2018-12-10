# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard import util


class UtilExportsTest(tf.test.TestCase):

  def test_util_exports(self):
    desired_exports = frozenset((
        "Ansi",
        "LogFormatter",
        "LogHandler",
        "PersistentOpEvaluator",
        "Retrier",
        "close_all",
        "closeable",
        "encode_png",
        "encode_wav",
        "guarded_by",
        "setup_logging",
    ))
    actual_exports = frozenset(dir(util))
    missing_exports = desired_exports - actual_exports
    self.assertFalse(missing_exports,
        "tensorboard.util is missing exports: %s" % sorted(missing_exports))


if __name__ == '__main__':
  tf.test.main()
