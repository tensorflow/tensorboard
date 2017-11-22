package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_dashboard",
    srcs = ["tf-graph-dashboard.html"],
    path = "/tf-graph-dashboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_tensorboard:registry",
        "//tensorboard/components/vz_sorting",
        "//tensorboard/plugins/graph/tf_graph",
        "//tensorboard/plugins/graph/tf_graph_board",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/graph/tf_graph_loader",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_dashboard"],
    destdir = "tf-graph-dashboard",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_dashboard_common:legacy",
        "//tensorboard/components/vz_sorting:legacy",
        "//tensorboard/plugins/graph/tf_graph:legacy",
        "//tensorboard/plugins/graph/tf_graph_board:legacy",
        "//tensorboard/plugins/graph/tf_graph_controls:legacy",
        "//tensorboard/plugins/graph/tf_graph_loader:legacy",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
