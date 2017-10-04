from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json

from tensorboard.backend import application

import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from beholder.tensorboard_x.main import get_plugins
from beholder.file_system_tools import write_pickle

URL_PREFIX = 'data/plugin/beholder'

class PluginTest(tf.test.TestCase):

  def _write_dummy_files(self):
    plugin_dir = '/tmp/beholder-test/plugins/beholder'
    tf.gfile.MakeDirs(plugin_dir)

    info_path = plugin_dir + '/section-info.pkl'
    config_path = plugin_dir + '/config.pkl'

    write_pickle([{
        'shape': '(3, 3, 3, 64)',
        'mean': '1.131e-07',
        'min': '2.022e-11',
        'range': '3.949e-07',
        'name': 'conv1_1/weights:0',
        'max': '3.949e-07'
    }], info_path)

    write_pickle({
        'values': 'trainable_variables',
        'mode': 'variance',
        'scaling': 'layer',
        'window_size': 10,
        'FPS': 10,
        'is_recording': False,
        'show_all': False,
        'colormap': 'grayscale'
    }, config_path)

  def setUp(self):
    self._write_dummy_files()

    app = application.standard_tensorboard_wsgi(
        '/tmp/beholder-demo',
        True,
        5,
        get_plugins()
    )
    self.server = werkzeug_test.Client(app, wrappers.BaseResponse)



  def _make_url(self, path):
    return URL_PREFIX + '/' + path


  def _post(self, path, data):
    response = self.server.post(self._make_url(path), data=data)
    self.assertEqual(200, response.status_code)
    return json.loads(response.get_data().decode('utf-8'))


  def _get_json(self, path):
    path = self._make_url(path)
    response = self.server.get(path)
    self.assertEqual(200, response.status_code)
    self.assertEqual('application/json', response.headers.get('Content-Type'))
    return json.loads(response.get_data().decode('utf-8'))


  def test_section_info(self):
    response = self._get_json('section-info')
    info = response[0]
    self.assertIn('name', info)


  def test_change_config(self):
    response = self._post('change-config', data={
        'values': 'trainable_variables',
        'mode': 'variance',
        'scaling': 'layer',
        'window_size': 15,
        'FPS': 10,
        'is_recording': False,
        'show_all': False,
        'colormap': 'grayscale'
    })
    self.assertIn('window_size', response['config'])


  def test_beholder_frame(self):
    response = self.server.get(self._make_url('beholder-frame'))
    self.assertEqual(200, response.status_code)



if __name__ == '__main__':
  tf.test.main()
