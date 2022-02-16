# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
TensorBoard external Rust dependencies (both infrastructure and frontend libs)
"""

load("@rules_rust//rust:repositories.bzl", "rust_repositories")
load("//third_party/rust:crates.bzl", "raze_fetch_remote_crates")

def tensorboard_rust_workspace():
    """TensorBoard Rust dependencies."""
    rust_repositories(version = "1.58.1")
    raze_fetch_remote_crates()
