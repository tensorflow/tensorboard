# Description:
# TensorBoard plugin for scalars

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//third_party/tensorflow:tensorflow.bzl", "py_test")

## Scalars Plugin ##
py_library(
    name = "scalars_plugin",
    srcs = ["scalars_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//third_party/tensorflow:internal",
    ],
    deps = [
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/plugins:base_plugin",
        "//third_party/tensorflow/python:summary",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_test(
    name = "scalars_plugin_test",
    size = "small",
    srcs = ["scalars_plugin_test.py"],
    main = "scalars_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":scalars_plugin",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//third_party/tensorflow/python:array_ops",
        "//third_party/tensorflow/python:client",
        "//third_party/tensorflow/python:client_testlib",
        "//third_party/tensorflow/python:platform",
        "//third_party/tensorflow/python:summary",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_binary(
    name = "scalars_demo",
    srcs = ["scalars_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
        "@six_archive//:six",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    visibility = ["//third_party/tensorflow:__pkg__"],
)
