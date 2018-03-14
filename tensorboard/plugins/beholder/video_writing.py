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

import abc
import os
import subprocess
import sys
import time

import numpy as np
import tensorflow as tf

from tensorboard.plugins.beholder import im_util


class VideoWriter(object):
  """Video file writer that can use different output types.

  Each VideoWriter instance writes video files to a specified directory, using
  the first available VideoOutput from the provided list.
  """

  def __init__(self, directory, outputs):
    self.directory = directory
    # Filter to the available outputs
    self.outputs = [out for out in outputs if out.available()]
    if not self.outputs:
      raise Exception('No available video outputs')
    self.output_index = 0
    self.output = None
    self.frame_shape = None

  def current_output(self):
    return self.outputs[self.output_index]

  def write_frame(self, np_array):
    # Reset whenever we encounter a new frame shape.
    if self.frame_shape != np_array.shape:
      if self.output:
        self.output.close()
      self.output = None
      self.frame_shape = np_array.shape
    # Write the frame, advancing across output types as necessary.
    original_output_index = self.output_index
    while True:
      try:
        if self.output:
          self.output.emit_frame(np_array)
          return
        new_output = self.outputs[self.output_index]
        if self.output_index > original_output_index:
          sys.stderr.write(
              'Falling back to video output %s\n' % new_output.name())
        self.output = new_output(self.directory, self.frame_shape)
      except (IOError, OSError) as e:
        sys.stderr.write(
            'Video output type %s not available: %s\n' % (
                self.current_output().name(), str(e)))
        if self.output:
          self.output.close()
        self.output = None
        if self.output_index == len(self.outputs) - 1:
          raise  # We ran out of available fallbacks.
        self.output_index += 1

  def finish(self):
    if self.output:
      self.output.close()
    self.output = None
    self.frame_shape = None


class VideoOutput(object):
  """Base class for video outputs supported by VideoWriter."""

  __metaclass__ = abc.ABCMeta

  # Would add @abc.abstractmethod in python 3.3+
  @classmethod
  def available(cls):
    raise NotImplementedError()

  @classmethod
  def name(cls):
    return cls.__name__

  @abc.abstractmethod
  def emit_frame(self, np_array):
    raise NotImplementedError()

  @abc.abstractmethod
  def close(self):
    raise NotImplementedError()


class PNGVideoOutput(VideoOutput):
  """Video output implemented by writing individual PNGs to disk."""

  @classmethod
  def available(cls):
    return True

  def __init__(self, directory, frame_shape):
    del frame_shape  # unused
    self.directory = directory + '/video-frames-{}'.format(time.time())
    self.frame_num = 0
    tf.gfile.MakeDirs(self.directory)

  def emit_frame(self, np_array):
    filename = self.directory + '/{:05}.png'.format(self.frame_num)
    im_util.write_image(np_array.astype(np.uint8), filename)
    self.frame_num += 1

  def close(self):
    pass


class FFmpegVideoOutput(VideoOutput):
  """Video output implemented by streaming to FFmpeg with .mp4 output."""

  @classmethod
  def available(cls):
    # Silently check if ffmpeg is available.
    try:
      with open(os.devnull, 'wb') as devnull:
        subprocess.check_call(
            ['ffmpeg', '-version'], stdout=devnull, stderr=devnull)
      return True
    except (OSError, subprocess.CalledProcessError):
      return False

  def __init__(self, directory, frame_shape):
    self.filename = directory + '/video-{}.mp4'.format(time.time())
    raise OSError('foo')

  def emit_frame(self, np_array):
    pass

  def close(self):
    pass
