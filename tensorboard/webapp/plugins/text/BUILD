# Description:
# TensorBoard Debugger V2 Plugin: A plugin for inspecting and debugging
# the internals of a TensorFlow program (e.g., graphs, functions and tensors),
# with a focus on TensorFlow 2.x.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "text_v2_plugin",
    srcs = ["text_v2_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/text:metadata",
        "//tensorboard/util:tensor_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)
