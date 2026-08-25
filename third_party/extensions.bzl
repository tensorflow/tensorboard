# Copyright 2026 The TensorFlow Authors. All Rights Reserved.
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

"""Bzlmod extensions for TensorBoard-owned third-party repositories."""

load("//third_party:fonts.bzl", "tensorboard_fonts_workspace")
load("//third_party:js.bzl", "tensorboard_js_workspace")
load("//third_party:python.bzl", "tensorboard_python_workspace")

def _tensorboard_python_dependencies_impl(_module_ctx):
    tensorboard_python_workspace()

tensorboard_python_dependencies = module_extension(
    implementation = _tensorboard_python_dependencies_impl,
)

def _tensorboard_web_dependencies_impl(_module_ctx):
    tensorboard_fonts_workspace()
    tensorboard_js_workspace()

tensorboard_web_dependencies = module_extension(
    implementation = _tensorboard_web_dependencies_impl,
)
