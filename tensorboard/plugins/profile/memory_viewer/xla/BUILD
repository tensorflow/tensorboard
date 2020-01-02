package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "xla",
    srcs = [
        "buffer-allocation.ts",
        "buffer-allocation-assigned.ts",
        "hlo-instruction.ts",
        "logical-buffer.ts",
        "shape.ts",
        "xla.html",
    ],
    path = "/memory-viewer",
    deps = [
        "//tensorboard/plugins/profile/memory_viewer/utils",
    ],
)
