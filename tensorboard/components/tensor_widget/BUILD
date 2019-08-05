package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensor_widget",
    srcs = [
        "health-pill-types.js",
        "tensor-widget.html",
        "tensor-widget.js",
        "types.js",
    ],
    path = "/tensor-widget",
    visibility = ["//visibility:public"],
    deps = [],
)
