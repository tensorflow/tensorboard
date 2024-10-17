load("//tensorboard/defs:protos.bzl", "tb_proto_library")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "encoder",
    srcs = ["encoder.py"],
    srcs_version = "PY3",
    deps = [
        ":op_evaluator",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "encoder_test",
    size = "small",
    srcs = ["encoder_test.py"],
    srcs_version = "PY3",
    deps = [
        ":encoder",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "grpc_util",
    srcs = ["grpc_util.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:version",
        "//tensorboard/util:tb_logging",
    ],
)

py_test(
    name = "grpc_util_test",
    size = "small",
    srcs = ["grpc_util_test.py"],
    srcs_version = "PY3",
    deps = [
        ":grpc_util",
        ":grpc_util_test_proto_py_pb2",
        ":grpc_util_test_proto_py_pb2_grpc",
        ":test_util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:test",
        "//tensorboard:version",
    ],
)

tb_proto_library(
    name = "grpc_util_test_proto",
    testonly = True,
    srcs = ["grpc_util_test.proto"],
    has_services = True,
)

py_library(
    name = "lazy_tensor_creator",
    srcs = ["lazy_tensor_creator.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/compat",
    ],
)

py_test(
    name = "lazy_tensor_creator_test",
    size = "small",
    srcs = ["lazy_tensor_creator_test.py"],
    srcs_version = "PY3",
    deps = [
        ":lazy_tensor_creator",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "op_evaluator",
    srcs = ["op_evaluator.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "op_evaluator_test",
    size = "small",
    srcs = ["op_evaluator_test.py"],
    srcs_version = "PY3",
    deps = [
        ":op_evaluator",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "io_util",
    srcs = ["io_util.py"],
    srcs_version = "PY3",
)

py_test(
    name = "io_util_test",
    size = "small",
    srcs = ["io_util_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":io_util",
        "//tensorboard:test",
    ],
)

py_library(
    name = "platform_util",
    srcs = ["platform_util.py"],
    srcs_version = "PY3",
)

py_test(
    name = "platform_util_test",
    size = "small",
    srcs = ["platform_util_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":platform_util",
        "//tensorboard:test",
    ],
)

py_library(
    name = "tb_logging",
    srcs = ["tb_logging.py"],
    srcs_version = "PY3",
)

py_library(
    name = "tensor_util",
    srcs = ["tensor_util.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub",
    ],
)

py_library(
    name = "test_util",
    testonly = 1,
    srcs = ["test_util.py"],
    srcs_version = "PY3",
    deps = [
        ":tb_logging",
        "//tensorboard:expect_absl_logging_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_library(
    name = "timing",
    srcs = ["timing.py"],
    srcs_version = "PY3",
    deps = [
        ":tb_logging",
    ],
)

py_test(
    name = "timing_test",
    size = "small",
    srcs = ["timing_test.py"],
    srcs_version = "PY3",
    deps = [
        ":tb_logging",
        ":timing",
        "//tensorboard:test",
    ],
)
