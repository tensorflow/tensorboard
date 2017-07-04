package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "data",
    srcs = glob(["*.json"]),
    path = "/tf-trace-viewer/data/plugin/profile",
)

