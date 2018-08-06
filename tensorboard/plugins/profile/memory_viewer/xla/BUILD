package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "xla",
    srcs = [
        "xla.html",
        "shape.ts",
        "logical-buffer.ts",
        "buffer-allocation-assigned.ts",
        "buffer-allocation.ts",
        "hlo-instruction.ts",
    ],
    path = "/memory-viewer",
    deps = [
      "//tensorboard/plugins/profile/memory_viewer/utils",
    ]
)

