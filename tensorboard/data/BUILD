# Description:
# Experimental framework for generic TensorBoard data providers.

load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "provider",
    srcs = ["provider.py"],
    srcs_version = "PY3",
    deps = ["//tensorboard:expect_numpy_installed"],
)

py_test(
    name = "provider_test",
    size = "small",
    srcs = ["provider_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":provider",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:test",
    ],
)

py_library(
    name = "ingester",
    srcs = ["ingester.py"],
    srcs_version = "PY3",
)

py_test(
    name = "ingester_test",
    size = "small",
    srcs = ["ingester_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":ingester",
    ],
)

config_setting(
    name = "link_data_server",
    define_values = {"link_data_server": "true"},
)

py_library(
    name = "server_ingester",
    srcs = ["server_ingester.py"],
    data = select({
        ":link_data_server": ["//tensorboard/data/server"],
        "//conditions:default": [],
    }),
    srcs_version = "PY3",
    deps = [
        ":grpc_provider",
        ":ingester",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_pkg_resources_installed",
        "//tensorboard/data/proto:protos_all_py_pb2",
        "//tensorboard/util:tb_logging",
    ],
)

py_test(
    name = "server_ingester_test",
    size = "medium",  # time.sleep
    timeout = "short",
    srcs = ["server_ingester_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":grpc_provider",
        ":server_ingester",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:test",
        "//tensorboard/util:grpc_util",
    ],
)

py_library(
    name = "grpc_provider",
    srcs = ["grpc_provider.py"],
    srcs_version = "PY3",
    deps = [
        ":provider",
        "//tensorboard:errors",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/data/proto:protos_all_py_pb2",
        "//tensorboard/data/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:tensor_util",
        "//tensorboard/util:timing",
    ],
)

py_test(
    name = "grpc_provider_test",
    size = "small",
    srcs = ["grpc_provider_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":grpc_provider",
        ":provider",
        "//tensorboard:context",
        "//tensorboard:errors",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:test",
        "//tensorboard/data/proto:protos_all_py_pb2",
        "//tensorboard/data/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:tensor_util",
    ],
)
