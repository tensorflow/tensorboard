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
            "http://mirror.tensorflow.org/github.com/html5lib/html5lib-python/archive/1.0.1.tar.gz",
            "https://github.com/html5lib/html5lib-python/archive/1.0.1.tar.gz",
        ],
        sha256 = "fabbebd6a55d07842087f13849076eeed350aa8bb6c9ec840f6a6aba9388db06",
        strip_prefix = "html5lib-python-1.0.1",
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

    # We use `mock==1.0.0` because later versions depend on `pbr`, which
    # doesn't work well in a hermetic context (it tries to look up some
    # global configuration files; see GitHub pull request #2132).
    #
    # This dependency can go away entirely once we drop Python 2 support
    # and can just depend on `unittest.mock`.
    http_archive(
        name = "org_pythonhosted_mock",
        urls = [
            "http://mirror.tensorflow.org/files.pythonhosted.org/packages/85/60/ec8c1af81337bab0caba188b218b6758bc94f125f49062f7c5f0647749d2/mock-1.0.0.tar.gz",
            "https://files.pythonhosted.org/packages/85/60/ec8c1af81337bab0caba188b218b6758bc94f125f49062f7c5f0647749d2/mock-1.0.0.tar.gz",
        ],
        sha256 = "2d9fbe67001d2e8f02692075257f3c11e1b0194bd838c8ce3f49b31fc6c3f033",
        strip_prefix = "mock-1.0.0",
        build_file = str(Label("//third_party:mock.BUILD")),
    )

    http_archive(
        name = "org_pythonhosted_six",
        urls = [
            "http://mirror.tensorflow.org/pypi.python.org/packages/source/s/six/six-1.10.0.tar.gz",
            "http://pypi.python.org/packages/source/s/six/six-1.10.0.tar.gz",
        ],
        sha256 = "105f8d68616f8248e24bf0e9372ef04d3cc10104f1980f54d57b2ce73a5ad56a",
        strip_prefix = "six-1.10.0",
        build_file = str(Label("//third_party:six.BUILD")),
    )

    http_archive(
        name = "org_python_pypi_portpicker",
        urls = [
            "http://mirror.tensorflow.org/pypi.python.org/packages/96/48/0e1f20fdc0b85cc8722284da3c5b80222ae4036ad73210a97d5362beaa6d/portpicker-1.1.1.tar.gz",
            "https://pypi.python.org/packages/96/48/0e1f20fdc0b85cc8722284da3c5b80222ae4036ad73210a97d5362beaa6d/portpicker-1.1.1.tar.gz",
        ],
        sha256 = "2f88edf7c6406034d7577846f224aff6e53c5f4250e3294b1904d8db250f27ec",
        strip_prefix = "portpicker-1.1.1/src",
        build_file = str(Label("//third_party:portpicker.BUILD")),
    )

    http_archive(
        name = "org_tensorflow_serving_api",
        urls = [
            "http://mirror.tensorflow.org/files.pythonhosted.org/packages/b5/da/bd60d7b245dbe93f35aded752679124a61bb90154d4698f6f3dba30d75c6/tensorflow_serving_api-1.10.1-py2.py3-none-any.whl",
            "https://files.pythonhosted.org/packages/b5/da/bd60d7b245dbe93f35aded752679124a61bb90154d4698f6f3dba30d75c6/tensorflow_serving_api-1.10.1-py2.py3-none-any.whl",
        ],
        type = "zip",
        sha256 = "77bc67484c3d7ce58de24b68b9f4ba26f9f7c459361a257e970350105cae4838",
        build_file = str(Label("//third_party:tf_serving.BUILD")),
    )
