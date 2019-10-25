package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

licenses(["notice"])  # Apache 2.0

filegroup(
    name = "tf_web_library_default_typings",
    srcs = [
        # Ordering probably matters.
        "@com_microsoft_typescript//:lib.es6.d.ts",
        "@io_angular_clutz//:src/resources/closure.lib.d.ts",
        "clutz.d.ts",
    ],
    visibility = ["//visibility:public"],
)

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
    srcs = ["test_base.proto"],
    has_services = True,
    testonly = True,
)

tb_proto_library(
    name = "test_downstream",
    srcs = ["test_downstream.proto"],
    deps = [
        ":test_base",
    ],
    has_services = True,
    testonly = True,
)

exports_files(["web_test_python_stub.template.py"])
