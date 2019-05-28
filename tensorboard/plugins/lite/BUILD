# Description:
# TensorBoard plugin for TF Lite.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

py_library(
    name = "lite_plugin",
    srcs = ["lite_plugin.py", "lite_backend.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
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
    name = "lite_plugin_test",
    size = "medium",  # tf integration test
    srcs = ["lite_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":lite_demo_model",
        ":lite_plugin",
        ":lite_plugin_loader",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "lite_plugin_loader",
    srcs = ["lite_plugin_loader.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":lite_plugin",
        "//tensorboard/plugins:base_plugin",
    ],
)

py_test(
    name = "lite_plugin_loader_test",
    size = "medium",  # tf integration test
    srcs = ["lite_plugin_loader_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":lite_plugin",
        ":lite_plugin_loader",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/plugins:base_plugin",
    ],
)


py_binary(
    name = "lite_demo",
    srcs = ["lite_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":lite_demo_model",
        "//tensorboard:expect_absl_app_installed",
        "//tensorboard:expect_absl_flags_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "lite_demo_model",
    srcs = ["lite_demo_model.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)
