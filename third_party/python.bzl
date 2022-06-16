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

# TensorBoard external dependencies that are used on the python side.
# Protobuf and six were deliberately left in the top-level workspace, as they
# are used in TensorFlow as well.

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def tensorboard_python_workspace():
    """Initialize the TensorBoard Python workspace."""

    http_archive(
        name = "org_pythonhosted_markdown",
        urls = [
            "http://mirror.tensorflow.org/pypi.python.org/packages/1d/25/3f6d2cb31ec42ca5bd3bfbea99b63892b735d76e26f20dd2dcc34ffe4f0d/Markdown-2.6.8.tar.gz",
            "https://pypi.python.org/packages/1d/25/3f6d2cb31ec42ca5bd3bfbea99b63892b735d76e26f20dd2dcc34ffe4f0d/Markdown-2.6.8.tar.gz",
        ],
        strip_prefix = "Markdown-2.6.8",
        sha256 = "0ac8a81e658167da95d063a9279c9c1b2699f37c7c4153256a458b3a43860e33",
        build_file = str(Label("//third_party:markdown.BUILD")),
    )

    http_archive(
        name = "org_pythonhosted_urllib3",
        urls = [
            "http://mirror.tensorflow.org/pypi.python.org/packages/cb/34/db09a2f1e27c6ded5dd42afb0e3e2cf6f51ace7d75726385e8a3b1993b17/urllib3-1.25.tar.gz",
            "https://pypi.python.org/packages/cb/34/db09a2f1e27c6ded5dd42afb0e3e2cf6f51ace7d75726385e8a3b1993b17/urllib3-1.25.tar.gz",
            "https://files.pythonhosted.org/packages/cb/34/db09a2f1e27c6ded5dd42afb0e3e2cf6f51ace7d75726385e8a3b1993b17/urllib3-1.25.tar.gz",
        ],
        sha256 = "f03eeb431c77b88cf8747d47e94233a91d0e0fdae1cf09e0b21405a885700266",
        strip_prefix = "urllib3-1.25/src",
        build_file = str(Label("//third_party:urllib3.BUILD")),
    )

    http_archive(
        name = "org_html5lib",
        urls = [
            "http://mirror.tensorflow.org/github.com/html5lib/html5lib-python/archive/1.1.tar.gz",
            "https://github.com/html5lib/html5lib-python/archive/1.1.tar.gz",
        ],
        sha256 = "66e9e24a53c10c27abb6be8a3cf2cf55824c6ea1cef8570a633cb223ec46e894",
        strip_prefix = "html5lib-python-1.1",
        build_file = str(Label("//third_party:html5lib.BUILD")),
    )

    http_archive(
        name = "org_mozilla_bleach",
        urls = [
            "http://mirror.tensorflow.org/github.com/mozilla/bleach/archive/v2.0.tar.gz",
            "https://github.com/mozilla/bleach/archive/v2.0.tar.gz",
        ],
        strip_prefix = "bleach-2.0",
        sha256 = "789dcf3e7daf79c4c78518c6ebafd51bbaf111ac4263a97c08cf8d6a27eda820",
        build_file = str(Label("//third_party:bleach.BUILD")),
    )

    http_archive(
        name = "org_pocoo_werkzeug",
        urls = [
            "http://mirror.tensorflow.org/files.pythonhosted.org/packages/59/2d/b24bab64b409e22f026fee6705b035cb0698399a7b69449c49442b30af47/Werkzeug-0.15.4.tar.gz",
            "https://files.pythonhosted.org/packages/59/2d/b24bab64b409e22f026fee6705b035cb0698399a7b69449c49442b30af47/Werkzeug-0.15.4.tar.gz",
        ],
        strip_prefix = "Werkzeug-0.15.4",
        sha256 = "a0b915f0815982fb2a09161cb8f31708052d0951c3ba433ccc5e1aa276507ca6",
        build_file = str(Label("//third_party:werkzeug.BUILD")),
    )

    http_archive(
        name = "org_pythonhosted_webencodings",
        urls = [
            "http://mirror.tensorflow.org/files.pythonhosted.org/packages/0b/02/ae6ceac1baeda530866a85075641cec12989bd8d31af6d5ab4a3e8c92f47/webencodings-0.5.1.tar.gz",
            "https://files.pythonhosted.org/packages/0b/02/ae6ceac1baeda530866a85075641cec12989bd8d31af6d5ab4a3e8c92f47/webencodings-0.5.1.tar.gz",
        ],
        strip_prefix = "webencodings-0.5.1",
        sha256 = "b36a1c245f2d304965eb4e0a82848379241dc04b865afcc4aab16748587e1923",
        build_file = str(Label("//third_party:webencodings.BUILD")),
        patches = [
            # The `webencodings` PyPI package is licensed as BSD, and
            # the Git repository has a LICENSE file, but this license
            # file is not included in the actual .tar.gz archive
            # downloaded from PyPI. This was fixed in PR #13 [1], so any
            # future releases of `webencodings` should not have this
            # problem. Until then, we patch in the license file by hand.
            #
            # [1]: https://github.com/gsnedders/python-webencodings/pull/13
            "//third_party:webencodings_license.patch",
        ],
    )

    http_archive(
        name = "org_pythonhosted_six",
        urls = [
            "http://mirror.tensorflow.org/pypi.python.org/packages/source/s/six/six-1.13.0.tar.gz",
            "https://pypi.python.org/packages/source/s/six/six-1.13.0.tar.gz",
        ],
        sha256 = "30f610279e8b2578cab6db20741130331735c781b56053c59c4076da27f06b66",
        strip_prefix = "six-1.13.0",
        build_file = str(Label("//third_party:six.BUILD")),
    )
