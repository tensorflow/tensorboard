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
"""Converts a TF-event file to the resulting JSON file of end-to-end profiling.

   Usages:
     tfevents_to_endtoend.py --tfevents_file=abc.tfevents --target_dir=/tmp/profile_plugins/plugins/profile/bar

"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import os.path

from absl import app
from absl import flags

from tensorboard.plugins.profile import end_to_end_helper

flags.DEFINE_string("tfevents_file", None, """The path to the tf-event file.""")
flags.DEFINE_string("target_dir", None, """The directory where the result JSON
file will be written to.""")

FLAGS = flags.FLAGS

def main(unused_argv=None):
  tfevents_file = FLAGS.tfevents_file
  if not tfevents_file:
    print("The --tfevents_file is required.")
    return -1
  tfevents_file = os.path.abspath(tfevents_file)
  if not os.access(tfevents_file, os.F_OK):
    print("tfevents_file (%s) does not exist!"%tfevents_file)
    return -1
  if not os.access(tfevents_file, os.R_OK):
    print("tfevents_file (%s) is not readable!"%tfevents_file)
    return -1
  print("tfevents_file (%s) is readable."%tfevents_file)
  
  target_dir = FLAGS.target_dir
  if not target_dir:
    print("The --target_dir is required.")
    return -1
  target_dir = os.path.abspath(target_dir)
  if not os.access(target_dir, os.F_OK):
    print("target_dir (%s) does not exist!"%target_dir)
    return -1
  if not os.access(target_dir, os.W_OK):
    print("target_dir (%s) is not writable!"%target_dir)
    return -1
  print("target_dir (%s) is writable."%target_dir)
  end_to_end_helper.create_end_to_end_json(target_dir, tfevents_file)


if __name__ == '__main__':
  app.run(main)
