# Embedding Projector plugin.

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//third_party/tensorflow:tensorflow.bzl", "py_test")
load("//third_party/tensorflow/core:platform/google/build_config.bzl", "tf_proto_library")

py_library(
    name = "projector_plugin",
    srcs = ["projector_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//third_party/tensorflow:internal"],
    deps = [
        ":protos_all_py",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//third_party/tensorflow/python:errors",
        "//third_party/tensorflow/python:image_ops",
        "//third_party/tensorflow/python:lib",
        "//third_party/tensorflow/python:platform",
        "//third_party/tensorflow/python:training",
        "@org_pocoo_werkzeug//:werkzeug",
    ],
)

py_test(
    name = "projector_plugin_test",
    size = "small",
    srcs = ["projector_plugin_test.py"],
    main = "projector_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":projector_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//third_party/tensorflow/core:protos_all_py",
        "//third_party/tensorflow/python:client",
        "//third_party/tensorflow/python:client_testlib",
        "//third_party/tensorflow/python:init_ops",
        "//third_party/tensorflow/python:platform",
        "//third_party/tensorflow/python:summary",
        "//third_party/tensorflow/python:training",
        "//third_party/tensorflow/python:variable_scope",
        "//third_party/tensorflow/python:variables",
        "@org_pocoo_werkzeug//:werkzeug",
    ],
)

tf_proto_library(
    name = "protos_all",
    srcs = glob(["*.proto"]),
    visibility = ["//visibility:public"],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    visibility = ["//third_party/tensorflow:__pkg__"],
)

py_proto_library(
    name = "protos_all_py_pb2",
    api_version = 2,
    visibility = ["//visibility:public"],
    deps = [":protos_all"],
)
