# Description:
# Summary API for TensorBoard.

licenses(["notice"])  # Apache 2.0

py_library(
    name = "summary",
    srcs = [
        "__init__.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
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
    deps = [
        ":summary",
        ":summary_v1",
        ":summary_v2",
        "//tensorboard:expect_tensorflow_installed",
    ],
)
