package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:web.bzl", "ts_web_library")
load("//tensorboard:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tensorboard",
    srcs = [
        "analytics.html",
        "tensorboard.html",
    ],
    path = "/",
    deps = ["//tensorboard/components/tf_tensorboard"],
)

tensorboard_html_binary(
    name = "index",
    input_path = "/tensorboard.html",
    output_path = "/index.html",
    deps = [":tensorboard"],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
