# Description:
# TensorBoard Debugger V2 Plugin: A plugin for inspecting and debugging
# the internals of a TensorFlow program (e.g., graphs, functions and tensors),
# with a focus on TensorFlow 2.x.

load("//tensorboard/defs:protos.bzl", "tb_proto_library")
package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "text_v2_plugin",
    srcs = ["text_v2_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:tensor_util",
        "//tensorboard/data:provider",
        "//tensorboard/plugins/text:text_plugin",
        "//tensorboard/webapp/plugins/text:metadata",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//tensorboard:internal"
    ],
    deps = [
        #":protos_all_py_pb2",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tb_logging",
    ],
)
