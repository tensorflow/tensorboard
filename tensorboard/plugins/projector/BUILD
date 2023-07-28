# Embedding Projector plugin.

load("//tensorboard/defs:protos.bzl", "tb_proto_library")
load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "projector_plugin",
    srcs = ["projector_plugin.py"],
    data = [
        "//tensorboard/plugins/projector/tf_projector_plugin:projector_assets",
    ],
    srcs_version = "PY3",
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard:context",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_protobuf_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:plugin_asset_util",
        "//tensorboard/compat:tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "projector",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard:expect_protobuf_installed",
        "//tensorboard/compat:tensorflow",
    ],
)

py_test(
    name = "projector_api_test",
    size = "small",
    srcs = ["projector_api_test.py"],
    main = "projector_api_test.py",
    srcs_version = "PY3",
    deps = [
        ":projector",
        "//tensorboard:expect_protobuf_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/util:test_util",
    ],
)

py_test(
    name = "projector_plugin_test",
    size = "small",
    srcs = ["projector_plugin_test.py"],
    main = "projector_plugin_test.py",
    srcs_version = "PY3",
    deps = [
        ":projector_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_protobuf_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "projector_plugin_notf_test",
    size = "small",
    srcs = ["projector_plugin_test.py"],
    main = "projector_plugin_test.py",
    srcs_version = "PY3",
    deps = [
        ":projector_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_protobuf_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY3",
)

tb_proto_library(
    name = "protos_all",
    srcs = glob(["*.proto"]),
    visibility = ["//visibility:public"],
)

py_binary(
    name = "projector_demo",
    srcs = ["projector_demo.py"],
    srcs_version = "PY3",
    deps = [
        ":projector",
    ],
)
