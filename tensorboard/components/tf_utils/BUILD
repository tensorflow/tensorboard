package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_utils",
    srcs = [
        "utils.js",
        "tf-utils.html",
    ],
    path = "/tf-utils",
    visibility = ["//visibility:public"],
)
