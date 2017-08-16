# Description:
# TensorBoard plugin for precision-recall curves.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    deps = [
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
        ":protos_all_py_pb2",
        ":pr_curve_demo",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = ["plugin_data.proto"],
    visibility = ["//visibility:public"],
)

py_binary(
    name = "pr_curve_demo",
    srcs = ["pr_curve_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)
