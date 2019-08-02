package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "memory_usage",
    srcs = [
        "memory-usage.html",
        "memory-usage.ts",
    ],
    path = "/memory-viewer",
    deps = [
        "//tensorboard/plugins/profile/memory_viewer/utils",
        "//tensorboard/plugins/profile/memory_viewer/xla",
    ],
)

