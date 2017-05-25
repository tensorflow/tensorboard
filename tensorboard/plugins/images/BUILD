# Description:
# TensorBoard plugin for images

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//third_party/tensorflow:tensorflow.bzl", "py_test")

py_library(
    name = "images_plugin",
    srcs = ["images_plugin.py"],
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
    name = "images_plugin_test",
    size = "small",
    srcs = ["images_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":images_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//third_party/tensorflow/core:protos_all_py",
        "//third_party/tensorflow/python:array_ops",
        "//third_party/tensorflow/python:client",
        "//third_party/tensorflow/python:client_testlib",
        "//third_party/tensorflow/python:platform",
        "//third_party/tensorflow/python:summary",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    visibility = ["//third_party/tensorflow:__pkg__"],
)
