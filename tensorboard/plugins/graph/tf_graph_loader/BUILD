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
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_loader"],
    destdir = "tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/plugins/graph/tf_graph_common:legacy",
    ],
)

tf_web_library(
    name = "tf_graph_dashboard_loader",
    srcs = [
        "tf-graph-dashboard-loader.html",
        "tf-graph-dashboard-loader.ts",
    ],
    path = "/tf-graph-loader",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_controls",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy_dashboard_loader",
    srcs = [":tf_graph_dashboard_loader"],
    destdir = "tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/plugins/graph/tf_graph_common:legacy",
        "//tensorboard/plugins/graph/tf_graph_controls:legacy",
    ],
)
