package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_end_to_end",
    srcs = ["tf-end-to-end.html"],
    path = "/tf-end-to-end",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/plugins/profile/google_chart",
    ],
)
