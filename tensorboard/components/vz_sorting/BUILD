package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "vz_sorting",
    srcs = [
        "sorting.ts",
        "vz-sorting.html",
    ],
    path = "/vz-sorting",
    visibility = ["//visibility:public"],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":vz_sorting"],
    destdir = "vz-sorting",
)

