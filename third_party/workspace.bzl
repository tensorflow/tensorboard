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

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@io_bazel_rules_closure//closure/private:java_import_external.bzl", "java_import_external")
load("@io_bazel_rules_closure//closure:defs.bzl", "filegroup_external")
load("@io_bazel_rules_closure//closure:defs.bzl", "web_library_external")
load("@io_bazel_rules_webtesting//web/internal:platform_http_file.bzl", "platform_http_file")
load("//third_party:fonts.bzl", "tensorboard_fonts_workspace")
load("//third_party:polymer.bzl", "tensorboard_polymer_workspace")
load("//third_party:python.bzl", "tensorboard_python_workspace")
load("//third_party:js.bzl", "tensorboard_js_workspace")
load("//third_party:typings.bzl", "tensorboard_typings_workspace")

def tensorboard_workspace():
  """Add repositories needed to build TensorBoard."""
  tensorboard_fonts_workspace()
  tensorboard_polymer_workspace()
  tensorboard_python_workspace()
  tensorboard_typings_workspace()
  tensorboard_js_workspace()

  http_archive(
      name = "com_google_protobuf_js",
      strip_prefix = "protobuf-3.6.0/js",
      sha256 = "50a5753995b3142627ac55cfd496cebc418a2e575ca0236e29033c67bd5665f4",
      urls = [
          "http://mirror.tensorflow.org/github.com/google/protobuf/archive/v3.6.0.tar.gz",
          "https://github.com/google/protobuf/archive/v3.6.0.tar.gz",
      ],
      build_file = "@io_bazel_rules_closure//closure/protobuf:protobuf_js.BUILD",
  )

  # Protobuf's BUILD file depends on //external:six.
  native.bind(
      name = "six",
      actual = "@org_pythonhosted_six",
  )

  platform_http_file(
      name = "org_chromium_chromium",
      licenses = ["notice"],  # BSD 3-clause (maybe more?)
      amd64_sha256 =
          "6933d0afce6e17304b62029fbbd246cbe9e130eb0d90d7682d3765d3dbc8e1c8",
      amd64_urls = [
          "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/561732/chrome-linux.zip",
      ],
      macos_sha256 =
          "084884e91841a923d7b6e81101f0105bbc3b0026f9f6f7a3477f5b313ee89e32",
      macos_urls = [
          "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/561733/chrome-mac.zip",
      ],
      windows_sha256 =
          "d1bb728118c12ea436d8ea07dba980789e7d860aa664dd1fad78bc20e8d9391c",
      windows_urls = [
          "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/540270/chrome-win32.zip",
      ],
  )

  platform_http_file(
      name = "org_chromium_chromedriver",
      licenses = ["reciprocal"],  # BSD 3-clause, ICU, MPL 1.1, libpng (BSD/MIT-like), Academic Free License v. 2.0, BSD 2-clause, MIT
      amd64_sha256 =
          "71eafe087900dbca4bc0b354a1d172df48b31a4a502e21f7c7b156d7e76c95c7",
      amd64_urls = [
          "https://chromedriver.storage.googleapis.com/2.41/chromedriver_linux64.zip",
      ],
      macos_sha256 =
          "fd32a27148f44796a55f5ce3397015c89ebd9f600d9dda2bcaca54575e2497ae",
      macos_urls = [
          "https://chromedriver.storage.googleapis.com/2.41/chromedriver_mac64.zip",
      ],
      windows_sha256 =
          "a8fa028acebef7b931ef9cb093f02865f9f7495e49351f556e919f7be77f072e",
      windows_urls = [
          "https://chromedriver.storage.googleapis.com/2.38/chromedriver_win32.zip",
      ],
  )

  java_import_external(
      name = "org_apache_commons_lang3",
      jar_sha256 = "de2e1dcdcf3ef917a8ce858661a06726a9a944f28e33ad7f9e08bea44dc3c230",
      jar_urls = [
          "http://mirror.tensorflow.org/repo1.maven.org/maven2/org/apache/commons/commons-lang3/3.9/commons-lang3-3.9.jar",
          "https://repo1.maven.org/maven2/org/apache/commons/commons-lang3/3.9/commons-lang3-3.9.jar",
      ],
      licenses = ["notice"],  # Apache 2.0
  )

  java_import_external(
      name = "org_apache_commons_text",
      jar_sha256 = "df45e56549b63e0fe716953c9d43cc158f8bf008baf60498e7c17f3faa00a70b",
      jar_urls = [
          "http://mirror.tensorflow.org/repo1.maven.org/maven2/org/apache/commons/commons-text/1.6/commons-text-1.6.jar",
          "https://repo1.maven.org/maven2/org/apache/commons/commons-text/1.6/commons-text-1.6.jar",
      ],
      licenses = ["notice"],  # Apache 2.0
  )
