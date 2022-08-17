# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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

import setuptools

import tensorboard_data_server


setuptools.setup(
    name="tensorboard_data_server",
    version=tensorboard_data_server.__version__.replace("-", ""),
    description="Fast data loading for TensorBoard",
    long_description="Fast data loading for TensorBoard",
    url="https://github.com/tensorflow/tensorboard/tree/master/tensorboard/data/server",
    author="Google Inc.",
    author_email="packages@tensorflow.org",
    packages=["tensorboard_data_server"],
    package_data={
        "tensorboard_data_server": [
            "bin/*",
        ],
    },
    python_requires=">=3.7",
    install_requires=[],
    tests_require=[],
    # PyPI package information. <https://pypi.org/classifiers/>
    classifiers=[
        "Development Status :: 2 - Pre-Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Education",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Rust",
        "Topic :: Scientific/Engineering :: Mathematics",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Software Development :: Libraries",
    ],
    license="Apache 2.0",
    keywords="tensorflow tensorboard tensor machine learning visualizer",
)
