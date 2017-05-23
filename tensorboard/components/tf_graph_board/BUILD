package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_graph_board",
    srcs = [
        "tf-graph-board.html",
    ],
    path = "/tf-graph-board",
    deps = [
        "//tensorboard/components/tf_graph",
        "//tensorboard/components/tf_graph_common",
        "//tensorboard/components/tf_graph_info",
        "@org_polymer",
        "@org_polymer_paper_progress",
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
        "tf-graph-board.html",
    ],
    destdir = "tf-graph-board",
    deps = [
        "//tensorboard/components/tf_graph:legacy",
        "//tensorboard/components/tf_graph_common:legacy",
        "//tensorboard/components/tf_graph_info:legacy",
    ],
)
