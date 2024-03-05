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
load("@io_bazel_rules_webtesting//web:web.bzl", "platform_archive")
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

    # We use our own browser definition based on the archives defined below, but
    # this seems to be required by the rules_webtesting dependency.
    browser_repositories(chromium = True)

    # Chromium browser for multiple platforms, pinned to Chromium 84.0.4147.0.
    platform_archive(
        name = "org_chromium_chromium_linux_x64",
        licenses = ["notice"],  # BSD 3-clause (maybe more?)
        sha256 = "49b25bf32b797558eb7957ac7c60e065433bdef278f669291f71edd329505e27",
        urls = [
            "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/768959/chrome-linux.zip",
        ],
        named_files = {
            "CHROMIUM": "chrome-linux/chrome",
        },
    )

    platform_archive(
        name = "org_chromium_chromium_macos",
        licenses = ["notice"],  # BSD 3-clause (maybe more?)
        sha256 = "f0c7dc5c26061e2f179d1cb9819cb786d2c37cca9f53155e57ac2b6ab60c5cbc",
        urls = [
            "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/768938/chrome-mac.zip",
        ],
        named_files = {
            "CHROMIUM": "chrome-mac/Chromium.app/Contents/MacOS/chromium",
        },
    )

    platform_archive(
        name = "org_chromium_chromium_windows",
        licenses = ["notice"],  # BSD 3-clause (maybe more?)
        sha256 = "f441a079046a35afc249a95d29356f33945c0a60b59236b9cf6db532c69dba6f",
        urls = [
            "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/768952/chrome-win.zip",
        ],
        named_files = {
            "CHROMIUM": "chrome-win/chrome.exe",
        },
    )

    # Chromium webdriver for multiple platforms.
    platform_archive(
        name = "org_chromium_chromedriver_linux_x64",
        licenses = ["reciprocal"],  # BSD 3-clause, ICU, MPL 1.1, libpng (BSD/MIT-like), Academic Free License v. 2.0, BSD 2-clause, MIT
        sha256 = "71eafe087900dbca4bc0b354a1d172df48b31a4a502e21f7c7b156d7e76c95c7",
        urls = [
            "https://chromedriver.storage.googleapis.com/2.41/chromedriver_linux64.zip",
        ],
        named_files = {"CHROMEDRIVER": "chromedriver"},
    )

    platform_archive(
        name = "org_chromium_chromedriver_macos",
        licenses = ["reciprocal"],  # BSD 3-clause, ICU, MPL 1.1, libpng (BSD/MIT-like), Academic Free License v. 2.0, BSD 2-clause, MIT
        sha256 = "fd32a27148f44796a55f5ce3397015c89ebd9f600d9dda2bcaca54575e2497ae",
        urls = [
            "https://chromedriver.storage.googleapis.com/2.41/chromedriver_mac64.zip",
        ],
        named_files = {"CHROMEDRIVER": "chromedriver"},
    )

    platform_archive(
        name = "org_chromium_chromedriver_windows",
        licenses = ["reciprocal"],  # BSD 3-clause, ICU, MPL 1.1, libpng (BSD/MIT-like), Academic Free License v. 2.0, BSD 2-clause, MIT
        sha256 = "a8fa028acebef7b931ef9cb093f02865f9f7495e49351f556e919f7be77f072e",
        urls = [
            "https://chromedriver.storage.googleapis.com/2.38/chromedriver_win32.zip",
        ],
        named_files = {"CHROMEDRIVER": "chromedriver"},
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
