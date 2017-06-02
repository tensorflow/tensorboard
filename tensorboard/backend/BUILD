# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//third_party/tensorflow:tensorflow.bzl", "py_test")

py_library(
    name = "http_util",
    srcs = ["http_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":json_util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_test(
    name = "http_util_test",
    size = "small",
    srcs = ["http_util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":http_util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_library(
    name = "json_util",
    srcs = ["json_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "json_util_test",
    size = "small",
    srcs = ["json_util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":json_util",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "application",
    srcs = ["application.py"],
    data = ["//tensorboard:assets"],
    srcs_version = "PY2AND3",
    deps = [
        ":http_util",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_test(
    name = "application_test",
    size = "medium",
    srcs = ["application_test.py"],
    srcs_version = "PY2AND3",
    tags = ["manual"],
    deps = [
        ":application",
        "//tensorboard",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
    ],
)

py_library(
    name = "process_graph",
    srcs = ["process_graph.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(
        [
            "*",
        ],
    ),
    visibility = ["//third_party/tensorflow:__subpackages__"],
)
