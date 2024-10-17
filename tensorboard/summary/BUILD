# Description:
# Summary API for TensorBoard.

load("//tensorboard/defs:py_repl.bzl", "py_repl")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# Standard TensorBoard summary writer API build target, which
# contains all optional dependencies. For a slimmer target see
# `:summary_minimal`.
py_library(
    name = "summary",
    deps = [
        ":summary_minimal",
    ],
)

# Minimal dependency for the TensorBoard summary writer APIs.
# Does not contain any optional deps, so some APIs may throw
# exceptions when called if not all their deps are satisfied.
py_library(
    name = "summary_minimal",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    deps = [
        ":writer",
    ],
)

py_library(
    name = "writer",
    srcs = [
        "_writer.py",
    ],
    srcs_version = "PY3",
    deps = [
        ":output",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/plugins/scalar:metadata",
    ],
)

py_test(
    name = "writer_test",
    srcs = ["_writer_test.py"],
    main = "_writer_test.py",
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":test_util",
        ":writer",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:test",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tensor_util",
    ],
)

py_library(
    name = "output",
    srcs = [
        "_output.py",
    ],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/summary/writer",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "output_test",
    srcs = ["_output_test.py"],
    main = "_output_test.py",
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":output",
        ":test_util",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:test",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tensor_util",
    ],
)

py_library(
    name = "summary_v1",
    srcs = [
        "v1.py",
    ],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":summary_minimal",
        "//tensorboard/plugins/audio:summary",
        "//tensorboard/plugins/custom_scalar:summary",
        "//tensorboard/plugins/histogram:summary",
        "//tensorboard/plugins/image:summary",
        "//tensorboard/plugins/pr_curve:summary",
        "//tensorboard/plugins/scalar:summary",
        "//tensorboard/plugins/text:summary",
    ],
)

py_library(
    name = "summary_v2",
    srcs = [
        "v2.py",
    ],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":summary_minimal",
        "//tensorboard/plugins/audio:summary_v2",
        "//tensorboard/plugins/histogram:summary_v2",
        "//tensorboard/plugins/image:summary_v2",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/plugins/text:summary_v2",
    ],
)

py_test(
    name = "summary_test",
    size = "small",
    srcs = ["summary_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":summary",
        ":summary_v1",
        ":summary_v2",
    ],
)

py_library(
    name = "test_util",
    testonly = 1,
    srcs = ["_test_util.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub",
    ],
)

# This library provides a _tf.summary package with summary API symbols from
# TensorBoard, meant to be overlayed into TensorFlow's namespace as tf.summary.
#
# Due to the mechanics of the component_api_helper() insertion mechanism, this
# must be a package (not module) without any sibling-level packages, where the
# desired name at the insertion point ("summary") must be the final component
# of the real package name, which necessitates putting this under two levels
# of dedicated directories. The inner __init__.py is the real code.
py_library(
    name = "tf_summary",
    srcs = [
        "_tf/__init__.py",
        "_tf/summary/__init__.py",
    ],
    srcs_version = "PY3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":summary_v2",
    ],
)

py_test(
    name = "tf_summary_test",
    size = "small",
    srcs = ["tf_summary_test.py"],
    srcs_version = "PY3",
    deps = [
        ":tf_summary",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

# REPL for interactive use/testing of the summary APIs.
py_repl(
    name = "repl",
    preamble = [
        "from tensorboard.summary import Writer",
        'w = Writer("/tmp/foo")',
    ],
    deps = [":summary"],
)
