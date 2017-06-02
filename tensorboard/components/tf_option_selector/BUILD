package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_option_selector",
    srcs = ["tf-option-selector.html"],
    path = "/tf-option-selector",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
