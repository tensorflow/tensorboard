# Description:
# Summary API for TensorBoard.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "summary",
    srcs = [
        "__init__.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//tensorboard:internal"],
    deps = [
        ":summary_v1",
        ":summary_v2",
    ],
)

py_library(
    name = "summary_v1",
    srcs = [
        "v1.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
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
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
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
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":summary",
        ":summary_v1",
        ":summary_v2",
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
    srcs_version = "PY2AND3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":summary_v2",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "tf_summary_test",
    size = "small",
    srcs = ["tf_summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":tf_summary",
        "//tensorboard:expect_tensorflow_installed",
    ],
)
