from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import io
import time

from google.protobuf import message
import numpy as np
import tensorboard
from tensorboard.backend import http_util
from tensorboard.backend.event_processing import plugin_asset_util as pau
from tensorboard.plugins import base_plugin
import tensorflow as tf
from werkzeug import wrappers

from beholder.im_util import get_image_relative_to_script, encode_png
from beholder.shared_config import PLUGIN_NAME, SECTION_HEIGHT, IMAGE_WIDTH
from beholder.shared_config import SECTION_INFO_FILENAME, CONFIG_FILENAME,\
  TAG_NAME, SUMMARY_FILENAME, DEFAULT_CONFIG
from beholder.file_system_tools import read_tensor_summary, read_pickle,\
  write_pickle

import sys
print(sys.version)

class BeholderPlugin(base_plugin.TBPlugin):

  plugin_name = PLUGIN_NAME

  def __init__(self, context):
    self._MULTIPLEXER = context.multiplexer
    self.PLUGIN_LOGDIR = pau.PluginDirectory(context.logdir, PLUGIN_NAME)
    self.FPS = 10
    self.most_recent_frame = get_image_relative_to_script('no-data.png')
    self.most_recent_info = [{
        'name': 'Waiting for data...',
    }]

    if not tf.gfile.Exists(self.PLUGIN_LOGDIR):
      tf.gfile.MakeDirs(self.PLUGIN_LOGDIR)
      write_pickle(DEFAULT_CONFIG, '{}/{}'.format(self.PLUGIN_LOGDIR,
                                                  CONFIG_FILENAME))


  def get_plugin_apps(self):
    return {
        '/change-config': self._serve_change_config,
        '/beholder-frame': self._serve_beholder_frame,
        '/section-info': self._serve_section_info,
        '/ping': self._serve_ping,
        '/tags': self._serve_tags,
        '/is-active': self._serve_is_active,
    }


  def is_active(self):
    summary_filename = '{}/{}'.format(self.PLUGIN_LOGDIR, SUMMARY_FILENAME)
    info_filename = '{}/{}'.format(self.PLUGIN_LOGDIR, SECTION_INFO_FILENAME)
    return tf.gfile.Exists(summary_filename) and\
           tf.gfile.Exists(info_filename)


  @wrappers.Request.application
  def _serve_is_active(self, request):
    return http_util.Respond(request,
                             {'is_active': self.is_active()},
                             'application/json')


  def _fetch_current_frame(self):
    path = '{}/{}'.format(self.PLUGIN_LOGDIR, SUMMARY_FILENAME)

    try:
      frame = read_tensor_summary(path).astype(np.uint8)
      self.most_recent_frame = frame
      return frame

    except (message.DecodeError, IOError, tf.errors.NotFoundError):
      return self.most_recent_frame


  @wrappers.Request.application
  def _serve_tags(self, request):
    if self.is_active:
      runs_and_tags = {
          'plugins/{}'.format(PLUGIN_NAME): {'tensors': [TAG_NAME]}
      }
    else:
      runs_and_tags = {}

    return http_util.Respond(request,
                             runs_and_tags,
                             'application/json')


  @wrappers.Request.application
  def _serve_change_config(self, request):
    config = {}

    for key, value in request.form.items():
      try:
        config[key] = int(value)
      except ValueError:
        if value == 'false':
          config[key] = False
        elif value == 'true':
          config[key] = True
        else:
          config[key] = value

    self.FPS = config['FPS']

    write_pickle(config, '{}/{}'.format(self.PLUGIN_LOGDIR, CONFIG_FILENAME))
    return http_util.Respond(request, {'config': config}, 'application/json')


  @wrappers.Request.application
  def _serve_section_info(self, request):
    path = '{}/{}'.format(self.PLUGIN_LOGDIR, SECTION_INFO_FILENAME)
    info = read_pickle(path, default=self.most_recent_info)
    self.most_recent_info = info
    return http_util.Respond(request, info, 'application/json')


  def _frame_generator(self):

    while True:
      last_duration = 0

      if self.FPS == 0:
        continue
      else:
        time.sleep(max(0, 1/(self.FPS) - last_duration))

      start_time = time.time()
      array = self._fetch_current_frame()
      image_bytes = encode_png(array)

      frame_text = b'--frame\r\n'
      content_type = b'Content-Type: image/png\r\n\r\n'

      response_content = frame_text + content_type + image_bytes + b'\r\n\r\n'

      last_duration = time.time() - start_time
      yield response_content


  @wrappers.Request.application
  def _serve_beholder_frame(self, request): # pylint: disable=unused-argument
    # Thanks to Miguel Grinberg for this technique:
    # https://blog.miguelgrinberg.com/post/video-streaming-with-flask
    mimetype = 'multipart/x-mixed-replace; boundary=frame'
    return wrappers.Response(response=self._frame_generator(),
                             status=200,
                             mimetype=mimetype)

  @wrappers.Request.application
  def _serve_ping(self, request): # pylint: disable=unused-argument
    return http_util.Respond(request, {'status': 'alive'}, 'application/json')
