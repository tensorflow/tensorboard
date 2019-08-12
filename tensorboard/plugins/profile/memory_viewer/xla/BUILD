package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "xla",
    srcs = [
        "xla.html",
        "shape.js",
        "logical-buffer.js",
        "buffer-allocation-assigned.js",
        "buffer-allocation.js",
        "hlo-instruction.js",
    ],
    path = "/memory-viewer",
    deps = [
      "//tensorboard/plugins/profile/memory_viewer/utils",
    ]
)

