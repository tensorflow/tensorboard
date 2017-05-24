package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_graph_dashboard",
    srcs = [
        "tf-graph-dashboard.html",
    ],
    path = "/tf-graph-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_graph",
        "//tensorboard/components/tf_graph_board",
        "//tensorboard/components/tf_graph_controls",
        "//tensorboard/components/tf_graph_loader",
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

load("//tensorboard:defs.bzl", "tensorboard_webcomponent_library")

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [
        "tf-graph-dashboard.html",
    ],
    destdir = "tf-graph-dashboard",
    deps = [
        "//tensorboard/components/tf_dashboard_common:legacy",
        "//tensorboard/components/tf_graph:legacy",
        "//tensorboard/components/tf_graph_board:legacy",
        "//tensorboard/components/tf_graph_controls:legacy",
        "//tensorboard/components/tf_graph_loader:legacy",
    ],
)
