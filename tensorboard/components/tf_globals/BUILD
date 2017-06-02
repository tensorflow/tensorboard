package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:tensorboard.google.bzl", "tensorboard_webcomponent_library")
load("//tensorboard:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_globals",
    srcs = [
        "globals.ts",
        "tf-globals.html",
    ],
    path = "/tf-globals",
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_globals"],
    destdir = "tf-globals",
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
