package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensor_widget",
    srcs = [
        "shape-helper.ts",
        "health-pill.ts",
        "health-pill-types.ts",
        "tensor-widget.css",
        "tensor-widget.html",
        "tensor-widget.ts",
        "tensor-widget-impl.ts",
        "types.ts",
    ],
    path = "/tensor-widget",
    visibility = ["//visibility:public"],
    deps = [],
)
