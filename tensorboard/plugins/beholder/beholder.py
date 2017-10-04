from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import time

import tensorflow as tf

from tensorboard.plugins.beholder import im_util
from tensorboard.plugins.beholder.file_system_tools import read_pickle,\
  write_pickle, write_file
from tensorboard.plugins.beholder.shared_config import PLUGIN_NAME, TAG_NAME,\
  SUMMARY_FILENAME, DEFAULT_CONFIG, CONFIG_FILENAME
from tensorboard.plugins.beholder import video_writing
from tensorboard.plugins.beholder.visualizer import Visualizer

class Beholder(object):

  def __init__(self, session, logdir):
    self.video_writer = None

    self.PLUGIN_LOGDIR = logdir + '/plugins/' + PLUGIN_NAME
    self.SESSION = session

    self.frame_placeholder = None
    self.summary_op = None

    self.last_image_shape = []
    self.last_update_time = time.time()
    self.config_last_modified_time = -1
    self.previous_config = dict(DEFAULT_CONFIG)

    if not tf.gfile.Exists(self.PLUGIN_LOGDIR + '/config.pkl'):
      tf.gfile.MakeDirs(self.PLUGIN_LOGDIR)
      write_pickle(DEFAULT_CONFIG, '{}/{}'.format(self.PLUGIN_LOGDIR,
                                                  CONFIG_FILENAME))

    self.visualizer = Visualizer(self.PLUGIN_LOGDIR)


  def _get_config(self):
    '''Reads the config file from disk or creates a new one.'''
    filename = '{}/{}'.format(self.PLUGIN_LOGDIR, CONFIG_FILENAME)
    modified_time = os.path.getmtime(filename)

    if modified_time != self.config_last_modified_time:
      config = read_pickle(filename, default=self.previous_config)
      self.previous_config = config
    else:
      config = self.previous_config

    self.config_last_modified_time = modified_time
    return config


  def _write_summary(self, frame):
    '''Writes the frame to disk as a tensor summary.'''
    summary = self.SESSION.run(self.summary_op, feed_dict={
        self.frame_placeholder: frame
    })
    path = '{}/{}'.format(self.PLUGIN_LOGDIR, SUMMARY_FILENAME)
    write_file(summary, path)



  def _get_final_image(self, config, arrays=None, frame=None):
    if config['values'] == 'frames':
      if frame is None:
        final_image = im_util.get_image_relative_to_script('frame-missing.png')
      else:
        frame = frame() if callable(frame) else frame
        final_image = im_util.scale_image_for_display(frame)

    elif config['values'] == 'arrays':
      if arrays is None:
        final_image = im_util.get_image_relative_to_script('arrays-missing.png')
        # TODO: hack to clear the info. Should be cleaner.
        self.visualizer._save_section_info([], [])
      else:
        final_image = self.visualizer.build_frame(arrays)

    elif config['values'] == 'trainable_variables':
      arrays = [self.SESSION.run(x) for x in tf.trainable_variables()]
      final_image = self.visualizer.build_frame(arrays)

    return final_image


  def _enough_time_has_passed(self, FPS):
    '''For limiting how often frames are computed.'''
    if FPS == 0:
      return False
    else:
      earliest_time = self.last_update_time + (1.0 / FPS)
      return time.time() >= earliest_time


  def _update_frame(self, arrays, frame, config):
    final_image = self._get_final_image(config, arrays, frame)

    if self.summary_op is None or self.last_image_shape != final_image.shape:
      self.frame_placeholder = tf.placeholder(tf.uint8, final_image.shape)
      self.summary_op = tf.summary.tensor_summary(TAG_NAME,
                                                  self.frame_placeholder)
    self._write_summary(final_image)
    self.last_image_shape = final_image.shape

    return final_image


  def _update_recording(self, frame, config):
    '''Adds a frame to the video using ffmpeg if possible. If not, writes
    individual frames as png files in a directory.
    '''
    # pylint: disable=redefined-variable-type
    is_recording = config['is_recording']
    filename = self.PLUGIN_LOGDIR + '/video-{}.mp4'.format(time.time())

    if is_recording:
      if self.video_writer is None or frame.shape != self.video_writer.size:
        try:
          self.video_writer = video_writing.FFMPEG_VideoWriter(filename,
                                                               frame.shape,
                                                               15)
        except OSError:
          message = ('Either ffmpeg is not installed, or something else went '
                     'wrong. Saving individual frames to disk instead.')
          print(message)
          self.video_writer = video_writing.PNGWriter(self.PLUGIN_LOGDIR,
                                                      frame.shape)
      self.video_writer.write_frame(frame)
    elif not is_recording and self.video_writer is not None:
      self.video_writer.close()
      self.video_writer = None


  # TODO: blanket try and except for production? I don't someone's script to die
  #       after weeks of running because of a visualization.
  def update(self, arrays=None, frame=None):
    '''Creates a frame and writes it to disk.

    Args:
      arrays: a list of np arrays. Use the "custom" option in the client.
      frame: a 2D np array. This way the plugin can be used for video of any
             kind, not just the visualization that comes with the plugin.

             frame can also be a function, which only is evaluated when the
             "frame" option is selected by the client.
    '''
    new_config = self._get_config()

    if self._enough_time_has_passed(self.previous_config['FPS']):
      self.visualizer.update(new_config)
      self.last_update_time = time.time()
      final_image = self._update_frame(arrays, frame, new_config)
      self._update_recording(final_image, new_config)


  ##############################################################################

  @staticmethod
  def gradient_helper(optimizer, loss, var_list=None):
    '''A helper to get the gradients out at each step.

    Args:
      optimizer: the optimizer op.
      loss: the op that computes your loss value.

    Returns: the gradient tensors and the train_step op.
    '''
    if var_list is None:
      var_list = tf.trainable_variables()

    grads_and_vars = optimizer.compute_gradients(loss, var_list=var_list)
    grads = [pair[0] for pair in grads_and_vars]

    return grads, optimizer.apply_gradients(grads_and_vars)
