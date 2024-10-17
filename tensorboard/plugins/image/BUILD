# Description:
# TensorBoard plugin for images

load("//tensorboard/defs:protos.bzl", "tb_proto_library")
load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

filegroup(
    name = "proto_srcs",
    srcs = glob(["*.proto"]),
)

py_library(
    name = "images_plugin",
    srcs = ["images_plugin.py"],
    srcs_version = "PY3",
    deps = [
        ":metadata",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_binary(
    name = "images_demo",
    srcs = ["images_demo.py"],
    srcs_version = "PY3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "images_plugin_test",
    size = "small",
    srcs = ["images_plugin_test.py"],
    srcs_version = "PY3",
    deps = [
        ":images_plugin",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "images_plugin_notf_test",
    size = "small",
    srcs = ["images_plugin_test.py"],
    main = "images_plugin_test.py",
    srcs_version = "PY3",
    deps = [
        ":images_plugin",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY3",
    deps = [
        ":metadata",
        ":summary_v2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/util:encoder",
    ],
)

py_library(
    name = "summary_v2",
    srcs = ["summary_v2.py"],
    srcs_version = "PY3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":metadata",
        "//tensorboard/compat",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:lazy_tensor_creator",
    ],
)

py_test(
    name = "summary_test",
    size = "small",
    srcs = ["summary_test.py"],
    srcs_version = "PY3",
    deps = [
        ":metadata",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = ["plugin_data.proto"],
)
