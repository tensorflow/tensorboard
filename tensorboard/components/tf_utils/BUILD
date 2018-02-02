package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_utils",
    srcs = [
        "utils.ts",
        "tf-utils.html",
    ],
    path = "/tf-utils",
    visibility = ["//visibility:public"],
)
