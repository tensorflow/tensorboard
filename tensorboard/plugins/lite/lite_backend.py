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
import os
import subprocess

import six
import tensorflow as tf


# Checks whether dependency is met.
is_supported = False
try:
  _lite_v1 = tf.compat.v1.lite
  _get_potentially_supported_ops = _lite_v1.experimental.get_potentially_supported_ops
  _TFLiteConverter = _lite_v1.TFLiteConverter
  _gfile = tf.io.gfile.walk
  is_supported = True
except AttributeError:
  pass


ISSUE_LINK = u"https://github.com/tensorflow/tensorflow/issues/new?template=40-tflite-op-request.md"
SELECT_TF_OPS_LINK = u"https://www.tensorflow.org/lite/using_select_tf_ops"


def to_unicode(str_bytes_or_unicode):
  """Converts string types (str, bytes, or unicode) to unicode."""
  if isinstance(str_bytes_or_unicode, six.text_type):  # Remain unicode type.
    return str_bytes_or_unicode
  elif isinstance(str_bytes_or_unicode, six.binary_type):  # Binarny to unicode.
    return str_bytes_or_unicode.decode("utf-8")
  raise ValueError("Not supported: %s" % str_bytes_or_unicode)


def get_suggestion(error_message):
  """Gets suggestion by identifying error message."""
  suggestion, tips_link = None, None
  error_unicode = to_unicode(error_message)
  suggestion_map = {
      u"ValueError: Invalid tensors":
          u"Please select valid tensors in graph (some nodes may be pruned).",
      u"both shapes must be equal":
          u"Please input your input_shapes",
      ISSUE_LINK:
          u"Please report the error to {}, or try select Tensorflow ops: {}."
          .format(ISSUE_LINK, SELECT_TF_OPS_LINK),
      u"a Tensor which does not exist": 
          u"please check your input_arrays and output_arrays argument."
  }
  for k in suggestion_map:
    if k in error_unicode:
      suggestion = suggestion_map[k]
      if ISSUE_LINK in error_unicode:
        tips_link = ISSUE_LINK
      break
  return suggestion, tips_link


def script_from_saved_model(saved_model_dir, output_file, input_arrays,
                            output_arrays):
  """Generates a script for saved model to convert from TF to TF Lite."""
  return u"""# --- Python code ---
import tensorflow as tf
lite = tf.compat.v1.lite

saved_model_dir = '{saved_model_dir}'
output_file = '{output_file}'
converter = lite.TFLiteConverter.from_saved_model(
    saved_model_dir,
    input_arrays={input_arrays},
    output_arrays={output_arrays})
tflite_model = converter.convert()
with tf.io.gfile.GFile(output_file, 'wb') as f:
  f.write(tflite_model)
  print('Write file: %s' % output_file)
""".format(
    saved_model_dir=saved_model_dir,
    output_file=output_file,
    input_arrays=input_arrays,
    output_arrays=output_arrays)


def execute(script, verbose=False):
  """Executes script from subprocess, and returns tuple(success, stdout, stderr)."""
  cmds = ['python', '-c', script]
  if verbose:
    print('Execute: %s' % cmds)
  pipe = subprocess.Popen(cmds,
                          stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE)
  stdout, stderr = pipe.communicate()
  success = (pipe.returncode == 0)
  return success, stdout, stderr


def get_potentially_supported_ops():
  """Gets potentially supported ops.

  Returns:
    list of str for op names.
  """
  supported_ops = _get_potentially_supported_ops()
  op_names = [s.op for s in supported_ops]
  return op_names


def get_saved_model_dirs(logdir):
  """Gets a list of nested saved model dirs."""
  maybe_contains_dirs = []
  for dirname, subdirs, files in tf.io.gfile.walk(logdir):
    relpath = os.path.relpath(dirname, logdir)
    for d in subdirs:
      subdir = os.path.normpath(os.path.join(relpath, d))
      if tf.saved_model.contains_saved_model(os.path.join(logdir, subdir)):
        maybe_contains_dirs.append(subdir)
  return maybe_contains_dirs


def safe_makedirs(dirpath):
  """Ensures dir is made, and safely handles errors."""
  try:
    if not tf.io.gfile.exists(dirpath):
      tf.io.gfile.makedirs(dirpath)
      return True
  except:
    pass
  return False
