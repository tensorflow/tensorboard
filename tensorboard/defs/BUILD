load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_test(
    name = "tb_proto_library_test",
    srcs = ["tb_proto_library_test.py"],
    deps = [
        ":test_base_py_pb2",
        ":test_base_py_pb2_grpc",
        ":test_downstream_py_pb2",
        ":test_downstream_py_pb2_grpc",
        "//tensorboard:test",
    ],
)

tb_proto_library(
    name = "test_base",
    testonly = True,
    srcs = ["test_base.proto"],
    has_services = True,
)

tb_proto_library(
    name = "test_downstream",
    testonly = True,
    srcs = ["test_downstream.proto"],
    has_services = True,
    deps = [
        ":test_base",
    ],
)

exports_files(["web_test_python_stub.template.py"])

exports_files(["rollup_config.js"])
