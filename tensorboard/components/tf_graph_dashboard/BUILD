package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:tensorboard.google.bzl", "tensorboard_webcomponent_library")
load("//tensorboard:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_graph_dashboard",
    srcs = ["tf-graph-dashboard.html"],
    path = "/tf-graph-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_graph",
        "//tensorboard/components/tf_graph_board",
        "//tensorboard/components/tf_graph_controls",
        "//tensorboard/components/tf_graph_loader",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_sorting",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_dashboard"],
    destdir = "tf-graph-dashboard",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_dashboard_common:legacy",
        "//tensorboard/components/tf_graph:legacy",
        "//tensorboard/components/tf_graph_board:legacy",
        "//tensorboard/components/tf_graph_controls:legacy",
        "//tensorboard/components/tf_graph_loader:legacy",
        "//tensorboard/components/vz_sorting:legacy",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
