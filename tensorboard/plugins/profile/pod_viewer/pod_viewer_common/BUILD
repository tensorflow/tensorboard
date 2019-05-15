package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "pod_viewer_common",
    srcs = [
        "pod-viewer-common.html",
        "proto.ts",
    ],
    path = "/pod-viewer",
)
