package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "pod_viewer_common",
    srcs = [
        "proto.ts",
        "pod-viewer-common.html",
    ],
    path = "/pod-viewer-common",
)
