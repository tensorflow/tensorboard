# Description:
# TensorBoard plugin for histograms

load("//tensorboard/defs:protos.bzl", "tb_proto_library")
load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

## Histograms Plugin ##
py_library(
    name = "histograms_plugin",
    srcs = ["histograms_plugin.py"],
    srcs_version = "PY3",
    deps = [
        ":metadata",
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "histograms_plugin_test",
    size = "medium",
    srcs = ["histograms_plugin_test.py"],
    main = "histograms_plugin_test.py",
    srcs_version = "PY3",
    deps = [
        ":histograms_plugin",
        ":summary",
        "//tensorboard:context",
        "//tensorboard:errors",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/backend/event_processing:tag_types",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "histograms_plugin_notf_test",
    size = "small",
    srcs = ["histograms_plugin_test.py"],
    main = "histograms_plugin_test.py",
    srcs_version = "PY3",
    deps = [
        ":histograms_plugin",
        ":summary",
        "//tensorboard:context",
        "//tensorboard:errors",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/backend/event_processing:tag_types",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
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

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY3",
    deps = [
        ":metadata",
        ":summary_v2",
        "//tensorboard:expect_tensorflow_installed",
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
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/compat",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:lazy_tensor_creator",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "summary_test",
    # `test_with_large_counts` will be skipped.
    size = "small",
    srcs = ["summary_test.py"],
    main = "summary_test.py",
    srcs_version = "PY3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "large_count_summary_test",
    # Ensure enough RAM for `test_with_large_counts`.
    size = "large",
    srcs = ["summary_test.py"],
    args = [
        "-- -k",
        "test_with_large_counts",
    ],
    main = "summary_test.py",
    srcs_version = "PY3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tensor_util",
    ],
)

py_binary(
    name = "histograms_demo",
    srcs = ["histograms_demo.py"],
    srcs_version = "PY3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = ["plugin_data.proto"],
)
