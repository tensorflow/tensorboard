load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# TODO(@wchargin): Split more granularly.
tb_proto_library(
    name = "protos_all",
    srcs = [
        "blob.proto",
        "experiment.proto",
        "export_service.proto",
        "scalar.proto",
        "server_info.proto",
        "tensor.proto",
        "write_service.proto",
    ],
    has_services = True,
    deps = ["//tensorboard/compat/proto:protos_all"],
)
