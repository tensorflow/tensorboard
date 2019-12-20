package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "xla",
    srcs = [
        "buffer-allocation.js",
        "buffer-allocation-assigned.js",
        "hlo-instruction.js",
        "logical-buffer.js",
        "shape.js",
        "xla.html",
    ],
    path = "/memory-viewer",
    deps = [
        "//tensorboard/plugins/profile/memory_viewer/utils",
    ],
)
