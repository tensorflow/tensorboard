# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Provides Bazel test targets for Web Component Tester tests."""

load("@io_bazel_rules_webtesting//web:py.bzl", "py_web_test_suite")

def _tf_web_test_python_stub_impl(ctx):
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = ctx.outputs.main,
        substitutions = {
            "{BINARY_PATH}": ctx.executable.web_library.short_path,
            "{WEB_PATH}": ctx.attr.web_path,
        },
    )

_tf_web_test_python_stub = rule(
    implementation = _tf_web_test_python_stub_impl,
    attrs = {
        "web_library": attr.label(executable = True, cfg = "host", mandatory = True),
        "web_path": attr.string(mandatory = True),
        "main": attr.output(),
        "_template": attr.label(
            default = Label("//tensorboard/defs:web_test_python_stub.template.py"),
            allow_single_file = True,
        ),
    },
)

def tf_web_test(name, web_library, src, **kwargs):
    """Run tests defined by a `tf_web_library`.

    By default, the test will have timeout = "short" and flaky = True.
    These options can be overridden.

    Args:
      name: name to use for the test target
      web_library: label of a `tf_web_library` target that defines the
          test cases to be run
      src: web path to the main HTML entry point of the test cases, which
          should be the concatenation of the tf_web_library's `path` with
          the name of the main HTML source file; e.g.:
          "/vz-foo/test/tests.html"
      **kwargs: forwarded to `py_web_test_suite` and thus indirectly to
          the `py_test` native rule
    """
    python_stub_name = name + "_python_stub"
    python_stub_output = name + ".py"
    _tf_web_test_python_stub(
        name = python_stub_name,
        web_library = web_library,
        web_path = src,
        main = python_stub_output,
        testonly = 1,
    )
    kwargs.setdefault("flaky", True)
    kwargs.setdefault("timeout", "short")
    py_web_test_suite(
        name = name,
        srcs = [python_stub_output],
        browsers = ["//tensorboard/functionaltests/browsers:chromium"],
        data = [web_library],
        srcs_version = "PY2AND3",
        deps = [
            "@io_bazel_rules_webtesting//testing/web",
            "@org_pythonhosted_urllib3//:org_pythonhosted_urllib3",
            "//tensorboard/functionaltests:wct_test_driver",
        ],
        **kwargs
    )
