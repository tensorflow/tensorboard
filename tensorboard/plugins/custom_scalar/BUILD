# Description:
# TensorBoard plugin for custom scalars plots

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

exports_files(["LICENSE"])

## Custom Scalars Plugin ##
py_library(
    name = "custom_scalars_plugin",
    srcs = ["custom_scalars_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "summary_test",
    size = "small",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":summary",
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard/backend:application",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "custom_scalars_plugin_test",
    size = "small",
    srcs = ["custom_scalars_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":custom_scalars_plugin",
        ":summary",
        ":protos_all_py_pb2",
        "//tensorboard/backend:application",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/plugins/scalar:summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = ["layout.proto"],
    visibility = ["//visibility:public"],
)

py_binary(
    name = "custom_scalar_demo",
    srcs = ["custom_scalar_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:summary",
        "@org_pythonhosted_six",
    ],
)
