# Description:
# TensorBoard plugin for custom scalars plots

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

## Custom Scalars Plugin ##
py_library(
    name = "custom_scalars_plugin",
    srcs = ["custom_scalars_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/compat:tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/util:tensor_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
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
        ":metadata",
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/util:tensor_util",
        "//tensorboard/util:test_util",
    ],
)

py_test(
    name = "custom_scalars_plugin_test",
    size = "small",
    srcs = ["custom_scalars_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":custom_scalars_plugin",
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:context",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/plugins/scalar:summary",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "custom_scalars_plugin_notf_test",
    size = "small",
    srcs = ["custom_scalars_plugin_test.py"],
    main = "custom_scalars_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":custom_scalars_plugin",
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:context",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/plugins/scalar:summary",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
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
        "//tensorboard/summary:summary_v1",
        "@org_pythonhosted_six",
    ],
)
