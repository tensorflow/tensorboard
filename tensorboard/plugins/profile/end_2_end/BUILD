package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "end_2_end",
    srcs = ["end-2-end.html"],
    path = "/end-2-end",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/plugins/profile/google_chart",
    ],
)
