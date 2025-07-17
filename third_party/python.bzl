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
#
# A couple of these are "vendored" with our package, see:
# https://github.com/tensorflow/tensorboard/blob/b94d9294eeb29ff5a673ef21843e060461ac78c2/tensorboard/pip_package/build_pip_package.sh#L87
#
# When building from source (i.e. whenever `bazel run` / `bazel test`
# is used, including for CI), these are the dependencies used, rather than
# whatever is already present (installed) in the system or runtime used.
#
# When not using bazel, but rather a "distributed" package of TB
# (e.g. the one installed with pip), the non-vendored dependencies must be
# already installed.
#
# Protobuf is deliberately left in the top-level workspace, as they
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

    # urllib3 is a transitive dependency from TF (or perhaps other
    # dependencies), not directly used in TB code. We use a specific version to
    # have a controlled environment, e.g. for CI.
    http_archive(
        name = "org_pythonhosted_urllib3",
        urls = [
            # Will upload to mirror after CI passes.
            # "http://mirror.tensorflow.org/files.pythonhosted.org/packages/e4/e8/6ff5e6bc22095cfc59b6ea711b687e2b7ed4bdb373f7eeec370a97d7392f/urllib3-1.26.20.tar.gz",
            "https://files.pythonhosted.org/packages/e4/e8/6ff5e6bc22095cfc59b6ea711b687e2b7ed4bdb373f7eeec370a97d7392f/urllib3-1.26.20.tar.gz",
        ],
        sha256 = "be35dfb571d8e1baefbf909756fa6526d000fd4e",
        strip_prefix = "urllib3-1.26.20/src",
        build_file = str(Label("//third_party:urllib3.BUILD")),
    )

    http_archive(
        name = "org_mozilla_bleach",
        urls = [
            "http://mirror.tensorflow.org/files.pythonhosted.org/packages/76/9a/0e33f5054c54d349ea62c277191c020c2d6ef1d65ab2cb1993f91ec846d1/bleach-6.2.0.tar.gz",
            "https://files.pythonhosted.org/packages/76/9a/0e33f5054c54d349ea62c277191c020c2d6ef1d65ab2cb1993f91ec846d1/bleach-6.2.0.tar.gz"
        ],
        strip_prefix = "bleach-6.2.0",
        sha256 = "123e894118b8a599fd80d3ec1a6d4cc7ce4e5882b1317a7e1ba69b56e95f991f",
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

