# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

import os
from setuptools import find_packages, setup


REQUIRED_PACKAGES = [
    'ipywidgets>=7.0.0',
    'jupyter>=1.0,<2',
    'tensorflow-serving-api>=1.12.0'
]

def get_readme():
  with open('README.rst') as f:
    return f.read()

def get_version():
  version_ns = {}
  with open(os.path.join('witwidget', 'version.py')) as f:
   exec(f.read(), {}, version_ns)
  return version_ns['VERSION'].replace('-', '')

setup(
  name='witwidget',
  version=get_version(),
  description='What-If Tool jupyter widget',
  long_description=get_readme(),
  author='Google Inc.',
  author_email='opensource@google.com',
  url='https://github.com/tensorflow/tensorboard/tree/master/tensorboard/plugins/interactive_inference/witwidget',
  include_package_data=True,
  data_files=[
      ('share/jupyter/nbextensions/wit-widget', [
        'witwidget/static/extension.js',
        'witwidget/static/index.js',
        'witwidget/static/index.js.map',
        'witwidget/static/wit_jupyter.html',
      ],),
      ('etc/jupyter/nbconfig/notebook.d/', ['wit-widget.json'])
  ],
  packages=find_packages(),
  zip_safe=False,
  install_requires=REQUIRED_PACKAGES,
  keywords=[
      'ipython',
      'jupyter',
      'widgets',
  ],
  license='Apache 2.0',
  classifiers=[
      'Development Status :: 4 - Beta',
      'Framework :: IPython',
      'Intended Audience :: Developers',
      'Intended Audience :: Science/Research',
      'Topic :: Multimedia :: Graphics',
      'Programming Language :: Python :: 2',
      'Programming Language :: Python :: 2.7',
      'Programming Language :: Python :: 3',
      'Programming Language :: Python :: 3.3',
      'Programming Language :: Python :: 3.4',
      'Programming Language :: Python :: 3.5',
  ]
)
