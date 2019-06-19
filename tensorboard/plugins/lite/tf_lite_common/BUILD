package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_lite_common",
    srcs = [
        "op.ts",
        "tf-lite-common.html",
    ],
    path = "/tf-lite-common",
    deps = [
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)

