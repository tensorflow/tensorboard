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
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_lite_common"],
    destdir = "/tf-lite-common",
    deps = [
        "//third_party/javascript/polymer/v1/polymer:lib",
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)

