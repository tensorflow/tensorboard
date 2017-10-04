'''
from https://github.com/Zulko/moviepy/blob/
  5a3cb6e78cd473a9b73f19b7cd0a31e371077da7/moviepy/video/io/ffmpeg_writer.py

The MIT License (MIT)
[OSI Approved License]

The MIT License (MIT)

Copyright (c) 2015 Zulko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

On the long term this will implement several methods to make videos
out of VideoClips
'''

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from abc import ABCMeta
from abc import abstractmethod
import os
import subprocess as sp
import sys
import time

import numpy as np
import tensorflow as tf

from tensorboard.plugins.beholder import im_util

DEVNULL = open(os.devnull, 'wb')
PY3 = sys.version_info.major >= 3


class BaseVideoWriter(object):
  __metaclass__ = ABCMeta

  @abstractmethod
  def write_frame(self, img_array):
    raise NotImplementedError()

  @abstractmethod
  def close(self):
    raise NotImplementedError()


class FFMPEG_VideoWriter(BaseVideoWriter):
  """ A class for FFMPEG-based video writing.

  A class to write videos using ffmpeg. ffmpeg will write in a large
  choice of formats.

  Parameters
  -----------

  filename
    Any filename like 'video.mp4' etc. but if you want to avoid
    complications it is recommended to use the generic extension
    '.avi' for all your videos.

  size
    Size (width,height) of the output video in pixels.

  fps
    Frames per second in the output video file.

  codec
    FFMPEG codec. It seems that in terms of quality the hierarchy is
    'rawvideo' = 'png' > 'mpeg4' > 'libx264'
    'png' manages the same lossless quality as 'rawvideo' but yields
    smaller files. Type ``ffmpeg -codecs`` in a terminal to get a list
    of accepted codecs.

    Note for default 'libx264': by default the pixel format yuv420p
    is used. If the video dimensions are not both even (e.g. 720x405)
    another pixel format is used, and this can cause problem in some
    video readers.

  preset
    Sets the time that FFMPEG will take to compress the video. The slower,
    the better the compression rate. Possibilities are: ultrafast,superfast,
    veryfast, faster, fast, medium (default), slow, slower, veryslow,
    placebo.

  bitrate
    Only relevant for codecs which accept a bitrate. "5000k" offers
    nice results in general.

  withmask
    Boolean. Set to ``True`` if there is a mask in the video to be
    encoded.

  """

  def __init__(self, filename, size, fps, codec="libx264", preset="medium",
               bitrate=None, logfile=None, threads=None, ffmpeg_params=None):

    if logfile is None:
      logfile = sp.PIPE

    self.size = size
    self.filename = filename
    self.codec = codec
    self.ext = self.filename.split(".")[-1]

    # order is important
    cmd = [
        'ffmpeg',
        '-y',
        '-loglevel', 'error' if logfile == sp.PIPE else 'info',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', '%dx%d' % (size[1], size[0]),
        '-pix_fmt', 'gray' if len(size) == 2 else 'rgb24',
        '-r', '%.02f' % fps,
        '-i', '-', '-an',
    ]

    cmd.extend([
        '-vcodec', codec,
        '-preset', preset,
    ])

    if ffmpeg_params is not None:
      cmd.extend(ffmpeg_params)
    if bitrate is not None:
      cmd.extend([
          '-b', bitrate
      ])

    if threads is not None:
      cmd.extend(["-threads", str(threads)])

    if ((codec == 'libx264') and
        (size[1] % 2 == 0) and
        (size[0] % 2 == 0)):
      cmd.extend([
          '-pix_fmt', 'gray' # 'yuv420p'
      ])
    cmd.extend([
        filename
    ])

    popen_params = {
        "stdout": DEVNULL,
        "stderr": logfile,
        "stdin": sp.PIPE
    }

    # This was added so that no extra unwanted window opens on windows
    # when the child process is created
    if os.name == "nt":
      popen_params["creationflags"] = 0x08000000

    self.proc = sp.Popen(cmd, **popen_params)


  def write_frame(self, img_array):
    """ Writes one frame in the file."""
    try:
      if PY3:
        self.proc.stdin.write(img_array.tobytes())
      else:
        self.proc.stdin.write(img_array.tostring())
    except IOError as err:
      _, ffmpeg_error = self.proc.communicate()
      error = (str(err) + ("\n\nMoviePy error: FFMPEG encountered "
                           "the following error while writing file %s:"
                           "\n\n %s" % (self.filename, str(ffmpeg_error))))

      if b"Unknown encoder" in ffmpeg_error:
        message = ("\n\nThe video export "
                   "failed because FFMPEG didn't find the specified "
                   "codec for video encoding (%s). Please install "
                   "this codec or change the codec when calling "
                   "write_videofile. For instance:\n"
                   "  >>> clip.write_videofile('myvid.webm', codec='libvpx')")

        error = error + message % (self.codec)

      elif b"incorrect codec parameters ?" in ffmpeg_error:
        message = ("\n\nThe video export "
                   "failed, possibly because the codec specified for "
                   "the video (%s) is not compatible with the given "
                   "extension (%s). Please specify a valid 'codec' "
                   "argument in write_videofile. This would be 'libx264' "
                   "or 'mpeg4' for mp4, 'libtheora' for ogv, 'libvpx for webm. "
                   "Another possible reason is that the audio codec was not "
                   "compatible with the video codec. For instance the video "
                   "extensions 'ogv' and 'webm' only allow 'libvorbis'"
                   " (default) as avideo codec.")

        error = error + message % (self.codec, self.ext)

      elif  b"encoder setup failed" in ffmpeg_error:

        error = error+("\n\nThe video export "
                       "failed, possibly because the bitrate you specified "
                       "was too high or too low for the video codec.")

      elif b"Invalid encoder type" in ffmpeg_error:

        error = error + ("\n\nThe video export failed because the codec "
                         "or file extension you provided is not a video")


      raise IOError(error)

  def close(self):
    self.proc.stdin.close()
    if self.proc.stderr is not None:
      self.proc.stderr.close()
    self.proc.wait()

    del self.proc


class PNGWriter(BaseVideoWriter):
  def __init__(self, logdir, size):
    self.frame_directory = logdir + '/video-frames-{}'.format(time.time())
    tf.gfile.MakeDirs(self.frame_directory)

    self.size = size
    self.frame_number = 0

  def write_frame(self, img_array):
    filename = '{}/{}.png'.format(self.frame_directory,
                                  str(self.frame_number).zfill(5))
    im_util.write_image(img_array.astype(np.uint8), filename)
    self.frame_number += 1

  def close(self):
    pass
