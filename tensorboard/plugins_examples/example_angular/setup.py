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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

REQUIRED_PACKAGES = [
    'werkzeug >= 0.11.15',
    'tensorboard >= 1.13.0',
]

setuptools.setup(
    name="tensorboard_plugin_angular",
    version="0.0.1",
    author="Plugin Author",
    author_email="author@example.com",
    description="A small example package",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github./pypa/sampleproject",
    packages=setuptools.find_packages(),
    package_data={
        "tensorboard_plugin_angular": ["frontend/dist/frontend/**"],
    },
    entry_points={
        "tensorboard_plugins": [
            "tensorboard_plugin_angular = tensorboard_plugin_angular.plugin:ExamplePlugin",
        ],
    },
    install_requires=REQUIRED_PACKAGES,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
