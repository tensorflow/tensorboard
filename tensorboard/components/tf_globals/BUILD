package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "ts_web_library")

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

