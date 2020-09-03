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

from setuptools import find_packages, setup

import tensorboard.version


def get_required_packages():
    with open("requirements.txt") as f:
        return f.read().splitlines()


def get_readme():
    with open("README.rst") as f:
        return f.read()


REQUIRED_PACKAGES = get_required_packages()

CONSOLE_SCRIPTS = [
    "tensorboard = tensorboard.main:run_main",
]

setup(
    name="tensorboard",
    version=tensorboard.version.VERSION.replace("-", ""),
    description="TensorBoard lets you watch Tensors Flow",
    long_description=get_readme(),
    url="https://github.com/tensorflow/tensorboard",
    author="Google Inc.",
    author_email="packages@tensorflow.org",
    # Contained modules and scripts.
    packages=find_packages(),
    entry_points={
        "console_scripts": CONSOLE_SCRIPTS,
        "tensorboard_plugins": [
            "projector = tensorboard.plugins.projector.projector_plugin:ProjectorPlugin",
        ],
    },
    package_data={
        "tensorboard": ["webfiles.zip",],
        # Must keep this in sync with tf_projector_plugin:projector_assets
        "tensorboard.plugins.projector": [
            "tf_projector_plugin/index.js",
            "tf_projector_plugin/projector_binary.html",
            "tf_projector_plugin/projector_binary.js",
        ],
    },
    # Disallow python 3.0 and 3.1 which lack a 'futures' module (see above).
    python_requires=">= 2.7, != 3.0.*, != 3.1.*",
    install_requires=REQUIRED_PACKAGES,
    tests_require=REQUIRED_PACKAGES,
    # PyPI package information.
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Education",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 2.7",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Topic :: Scientific/Engineering :: Mathematics",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Software Development :: Libraries",
    ],
    license="Apache 2.0",
    keywords="tensorflow tensorboard tensor machine learning visualizer",
)
