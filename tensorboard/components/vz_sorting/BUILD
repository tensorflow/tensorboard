package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:tensorboard.google.bzl", "tensorboard_webcomponent_library")
load("//tensorboard:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
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

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
