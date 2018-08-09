# Description:
# TensorBoard plugin for precision-recall curves.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "pr_curves_plugin",
    srcs = ["pr_curves_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "pr_curves_plugin_test",
    size = "medium",  # tf integration test
    srcs = ["pr_curves_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
        ":pr_curve_demo",
        ":pr_curves_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":metadata",
        "//tensorboard:expect_numpy_installed",
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
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
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
