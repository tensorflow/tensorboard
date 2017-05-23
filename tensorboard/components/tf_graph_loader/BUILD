package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_graph_loader",
    srcs = [
        "tf-graph-loader.html",
    ],
    path = "/tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_graph_common",
        "@org_polymer",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)

################################################################################
# MARKED FOR DELETION

load("//tensorboard:tensorboard.google.bzl", "tensorboard_webcomponent_library")

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [
        "tf-graph-loader.html",
    ],
    destdir = "tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_graph_common:legacy",
    ],
)
