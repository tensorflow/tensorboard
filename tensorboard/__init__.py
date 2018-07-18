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
# ==============================================================================
"""TensorBoard is a webapp for understanding TensorFlow runs and graphs.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.lazy import LazyLoader

pkg = lambda i: i  # helps google sync process
mod = lambda i: LazyLoader(i[i.rindex('.') + 1:], globals(), i)

program = mod(pkg('tensorboard.program'))
summary = mod(pkg('tensorboard.summary'))

del LazyLoader
del mod
del pkg
