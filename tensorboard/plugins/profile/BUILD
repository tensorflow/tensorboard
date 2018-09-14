# Description:
# TensorBoard plugin for the performance profiling.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

tb_proto_library(
    name = "protos_all",
    srcs = ["trace_events.proto"],
    visibility = ["//visibility:public"],
)

## Profile Plugin ##
py_library(
    name = "profile_plugin",
    srcs = ["profile_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":protos_all_py_pb2",
        ":trace_events_json",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:plugin_asset_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "profile_plugin_test",
    srcs = ["profile_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":profile_plugin",
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:plugin_asset_util",
        "//tensorboard/plugins:base_plugin",
    ],
)

py_library(
    name = "trace_events_json",
    srcs = ["trace_events_json.py"],
    srcs_version = "PY2AND3",
    deps = [
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "trace_events_json_test",
    size = "small",
    srcs = ["trace_events_json_test.py"],
    main = "trace_events_json_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":trace_events_json",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_binary(
    name = "profile_demo",
    srcs = [
        "profile_demo.py",
        "profile_demo_data.py",
    ],
    data = [
        "profile_demo.google_chart_demo.json",
        "profile_demo.memory_viewer.json",
        "profile_demo.op_profile.json",
    ],
    srcs_version = "PY2AND3",
    deps = [
        ":profile_plugin",
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:plugin_asset_util",
    ],
)
