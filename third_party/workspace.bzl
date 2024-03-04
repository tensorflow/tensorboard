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

"""
TensorBoard external dependencies that can be loaded in WORKSPACE files.
"""

load("@bazel_tools//tools/build_defs/repo:java.bzl", "java_import_external")
load("@io_bazel_rules_webtesting//web/versioned:browsers-0.3.3.bzl", "browser_repositories")
load("//third_party:fonts.bzl", "tensorboard_fonts_workspace")
load("//third_party:python.bzl", "tensorboard_python_workspace")
load("//third_party:js.bzl", "tensorboard_js_workspace")
load("//third_party:rust.bzl", "tensorboard_rust_workspace")

def tensorboard_workspace(name = ""):
    """Add repositories needed to build TensorBoard.

    Args:
        name: name of Bazel rule passed to this macro. The value is ignored.
    """
    tensorboard_fonts_workspace()
    tensorboard_python_workspace()
    tensorboard_js_workspace()
    tensorboard_rust_workspace()

    # Protobuf's BUILD file depends on //external:six.
    native.bind(
        name = "six",
        actual = "@org_pythonhosted_six",
    )

    # Needed by Protobuf.
    native.bind(
        name = "grpc_python_plugin",
        actual = "@com_github_grpc_grpc//src/compiler:grpc_python_plugin",
    )

    # Use the versioned browsers provided by the web testing rules package.
    browser_repositories(chromium=True)

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
