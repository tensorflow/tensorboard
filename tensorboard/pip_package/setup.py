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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import sys

from setuptools import find_packages, setup

import tensorboard.version


REQUIRED_PACKAGES = [
    'numpy >= 1.11.0',
    'six >= 1.10.0',
    'protobuf >= 3.2.0',
    'werkzeug >= 0.11.10',
    'html5lib == 0.9999999',  # identical to 1.0b8
    'markdown >= 2.6.8',
    'bleach == 1.5.0',
]

# python3 requires wheel 0.26
if sys.version_info.major == 3:
  REQUIRED_PACKAGES.append('wheel >= 0.26')
else:
  REQUIRED_PACKAGES.append('wheel')

CONSOLE_SCRIPTS = [
    'tensorboard = tensorboard.main:main',
]

def get_readme():
  with open('tensorboard/pip_package/README.rst') as f:
    return f.read()

setup(
    name='tensorflow-tensorboard',
    version=tensorboard.version.VERSION.replace('-', ''),
    description='TensorBoard lets you watch Tensors Flow',
    long_description=get_readme(),
    url='https://github.com/tensorflow/tensorboard',
    author='Google Inc.',
    author_email='opensource@google.com',
    # Contained modules and scripts.
    packages=find_packages(),
    entry_points={
        'console_scripts': CONSOLE_SCRIPTS,
    },
    package_data={
        'tensorboard': [
            'webfiles.zip',
        ],
    },
    install_requires=REQUIRED_PACKAGES,
    tests_require=REQUIRED_PACKAGES,
    # PyPI package information.
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Intended Audience :: Education',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: Apache Software License',
        'Programming Language :: Python :: 2.7',
        'Topic :: Scientific/Engineering :: Mathematics',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Software Development :: Libraries',
    ],
    license='Apache 2.0',
    keywords='tensorflow tensorboard tensor machine learning visualizer',
)
