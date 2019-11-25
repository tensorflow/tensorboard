package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

# TODO(@wchargin): Split more granularly.
tb_proto_library(
    name = "protos_all",
    srcs = [
        "export_service.proto",
        "scalar.proto",
        "server_info.proto",
        "write_service.proto",
    ],
    has_services = True,
    deps = [
        "//tensorboard/compat/proto:protos_all",
    ],
)
