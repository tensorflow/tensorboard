load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

filegroup(
    name = "proto_srcs",
    srcs = glob(["*.proto"]),
)

tb_proto_library(
    name = "protos_all",
    srcs = [
        "data_provider.proto",
    ],
    has_services = True,
    deps = ["//tensorboard/compat/proto:protos_all"],
)
