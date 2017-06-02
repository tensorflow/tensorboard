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
load("//third_party:polymer.bzl", "tensorboard_polymer_workspace")
load("//third_party:python.bzl", "tensorboard_python_workspace")
load("//third_party:js.bzl", "tensorboard_js_workspace")
load("//third_party:typings.bzl", "tensorboard_typings_workspace")

def tensorboard_workspace():
  tensorboard_polymer_workspace()
  tensorboard_python_workspace()
  tensorboard_typings_workspace()
  tensorboard_js_workspace()
  native.new_http_archive(
      name = "six_archive",
      urls = [
          "http://mirror.bazel.build/pypi.python.org/packages/source/s/six/six-1.10.0.tar.gz",
          "http://pypi.python.org/packages/source/s/six/six-1.10.0.tar.gz",
      ],
      sha256 = "105f8d68616f8248e24bf0e9372ef04d3cc10104f1980f54d57b2ce73a5ad56a",
      strip_prefix = "six-1.10.0",
      build_file = str(Label("//third_party:six.BUILD")),
  )

  native.bind(
      name = "six",
      actual = "@six_archive//:six",
  )
  native.http_archive(
      name = "protobuf",
      urls = [
          "http://mirror.bazel.build/github.com/google/protobuf/archive/2b7430d96aeff2bb624c8d52182ff5e4b9f7f18a.tar.gz",
          "https://github.com/google/protobuf/archive/2b7430d96aeff2bb624c8d52182ff5e4b9f7f18a.tar.gz",
      ],
      sha256 = "e5d3d4e227a0f7afb8745df049bbd4d55474b158ca5aaa2a0e31099af24be1d0",
      strip_prefix = "protobuf-2b7430d96aeff2bb624c8d52182ff5e4b9f7f18a",
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
      urls = [
          "http://mirror.bazel.build/github.com/google/protobuf/archive/2b7430d96aeff2bb624c8d52182ff5e4b9f7f18a.tar.gz",
          "https://github.com/google/protobuf/archive/2b7430d96aeff2bb624c8d52182ff5e4b9f7f18a.tar.gz",
      ],
      sha256 = "e5d3d4e227a0f7afb8745df049bbd4d55474b158ca5aaa2a0e31099af24be1d0",
      strip_prefix = "protobuf-2b7430d96aeff2bb624c8d52182ff5e4b9f7f18a",
  )

