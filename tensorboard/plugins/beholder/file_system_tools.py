from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import pickle

from google.protobuf import message
import tensorflow as tf

def write_file(contents, path, mode='wb'):
  with tf.gfile.Open(path, mode) as new_file:
    new_file.write(contents)


def read_tensor_summary(path):
  with tf.gfile.Open(path, 'rb') as summary_file:
    summary_string = summary_file.read()

  if not summary_string:
    raise message.DecodeError('Empty summary.')

  summary_proto = tf.Summary()
  summary_proto.ParseFromString(summary_string)
  tensor_proto = summary_proto.value[0].tensor
  array = tf.make_ndarray(tensor_proto)

  return array


def write_pickle(obj, path):
  with tf.gfile.Open(path, 'wb') as new_file:
    pickle.dump(obj, new_file)


def read_pickle(path, default=None):
  try:
    with tf.gfile.Open(path, 'rb') as pickle_file:
      result = pickle.load(pickle_file)

  except (IOError, EOFError, ValueError, tf.errors.NotFoundError) as e:
    # TODO: log this somehow? Could swallow errors I don't intend.
    if default is not None:
      result = default
    else:
      raise e

  return result


def resources_path():
  script_directory = os.path.dirname(__file__)
  filename = os.path.join(script_directory, 'resources')
  return filename
