package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_loader",
    srcs = [
        "tf-graph-loader.html",
        "tf-graph-loader.ts",
    ],
    path = "/tf-graph-loader",
    deps = [
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_loader"],
    destdir = "tf-graph-loader",
    deps = [
        "//tensorboard/plugins/graph/tf_graph_common:legacy",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

tf_web_library(
    name = "tf_graph_dashboard_loader",
    srcs = [
        "tf-graph-dashboard-loader.html",
        "tf-graph-dashboard-loader.ts",
    ],
    path = "/tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy_dashboard_loader",
    srcs = [":tf_graph_dashboard_loader"],
    destdir = "tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/plugins/graph/tf_graph_common:legacy",
        "//tensorboard/plugins/graph/tf_graph_controls:legacy",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
