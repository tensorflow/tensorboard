package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_op_profile",
    srcs = ["tf-op-profile.html"],
    path = "/tf-op-profile",
    visibility = ["//visibility:public"],
    deps = [
        ":tf_op_table",
    ],
)

ts_web_library(
    name = "tf_op_table",
    srcs = ["tf-op-table.html"],
    path = "/tf-op-profile",
    deps = [
    ],
)
