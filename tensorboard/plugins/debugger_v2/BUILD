# Description:
# TensorBoard Debugger V2 Plugin: A plugin for inspecting and debugging
# the internals of a TensorFlow program (e.g., graphs, functions and tensors),
# with a focus on TensorFlow 2.x.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "debugger_v2_plugin",
    srcs = ["debugger_v2_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "debugger_v2_plugin_test",
    size = "medium",
    srcs = ["debugger_v2_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":debugger_v2_plugin",
        "//tensorboard/backend:application",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
    ],
)
