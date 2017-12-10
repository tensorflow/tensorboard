# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

# TensorBoard external dependencies that can be loaded in WORKSPACE files.

load("@io_bazel_rules_closure//closure/private:java_import_external.bzl", "java_import_external")
load("@io_bazel_rules_closure//closure:defs.bzl", "filegroup_external")
load("@io_bazel_rules_closure//closure:defs.bzl", "web_library_external")
load("//third_party:fonts.bzl", "tensorboard_fonts_workspace")
load("//third_party:polymer.bzl", "tensorboard_polymer_workspace")
load("//third_party:python.bzl", "tensorboard_python_workspace")
load("//third_party:js.bzl", "tensorboard_js_workspace")
load("//third_party:typings.bzl", "tensorboard_typings_workspace")

def tensorboard_workspace():
  tensorboard_fonts_workspace()
  tensorboard_polymer_workspace()
  tensorboard_python_workspace()
  tensorboard_typings_workspace()
  tensorboard_js_workspace()

  native.http_archive(
      name = "protobuf",
      urls = [
          "http://mirror.bazel.build/github.com/google/protobuf/archive/v3.4.1.tar.gz",
          "https://github.com/google/protobuf/archive/v3.4.1.tar.gz",
      ],
      sha256 = "8e0236242106e680b4f9f576cc44b8cd711e948b20a9fc07769b0a20ceab9cc4",
      strip_prefix = "protobuf-3.4.1",
      # TODO: remove patching when tensorflow stops linking same protos into
      #       multiple shared libraries loaded in runtime by python.
      #       This patch fixes a runtime crash when tensorflow is compiled
      #       with clang -O2 on Linux (see https://github.com/tensorflow/tensorflow/issues/8394)
      # patch_file = str(Label("//third_party/protobuf:add_noinlines.patch")),
  )

  # We need to import the protobuf library under the names com_google_protobuf
  # and com_google_protobuf_cc to enable proto_library support in bazel.
  # Unfortunately there is no way to alias http_archives at the moment.
  native.http_archive(
      name = "com_google_protobuf",
      urls = ["https://mirror.bazel.build/github.com/google/protobuf/archive/0b059a3d8a8f8aa40dde7bea55edca4ec5dfea66.tar.gz"],
      sha256 = "6d43b9d223ce09e5d4ce8b0060cb8a7513577a35a64c7e3dad10f0703bf3ad93",
      strip_prefix = "protobuf-0b059a3d8a8f8aa40dde7bea55edca4ec5dfea66",
  )

  # Protobuf's BUILD file depends on //external:six.
  native.bind(
      name = "six",
      actual = "@org_pythonhosted_six",
  )

  filegroup_external(
      name = "org_chromium_chromedriver",
      licenses = ["notice"],  # Apache 2.0
      sha256_urls = {
          "59e6b1b1656a20334d5731b3c5a7400f92a9c6f5043bb4ab67f1ccf1979ee486": [
              "https://mirror.bazel.build/chromedriver.storage.googleapis.com/2.26/chromedriver_linux64.zip",
              "http://chromedriver.storage.googleapis.com/2.26/chromedriver_linux64.zip",
          ],
      },
      sha256_urls_macos = {
          "70aae3812941ed94ad8065bb4a9432861d7d4ebacdd93ee47bb2c7c57c7e841e": [
              "https://mirror.bazel.build/chromedriver.storage.googleapis.com/2.26/chromedriver_mac64.zip",
              "http://chromedriver.storage.googleapis.com/2.26/chromedriver_mac64.zip",
          ],
      },
      generated_rule_name = "archive",
  )

  # Roughly corresponds to Chrome 55
  filegroup_external(
      name = "org_chromium_chromium",
      licenses = ["restricted"],  # So many licenses
      sha256_urls = {
          "e3c99954d6acce013174053534b72f47f67f18a0d75f79c794daaa8dd2ae8aaf": [
              "https://mirror.bazel.build/commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/423768/chrome-linux.zip",
              "http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/423768/chrome-linux.zip",
          ],
      },
      sha256_urls_macos = {
          "62aeb7a5c6b8a1b7b31400105bf01295bbd45b0627920b8f99f0cc4ca76927ca": [
              "https://mirror.bazel.build/commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/423758/chrome-mac.zip",
              "http://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/423758/chrome-mac.zip",
          ],
      },
      generated_rule_name = "archive",
  )
