package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_app",
    srcs = [
        "tf-graph-app.html",
    ],
    path = "/tf-graph-app",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_board",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/graph/tf_graph_loader",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_app"],
    destdir = "tf-graph-app",
    deps = [
        "//tensorboard/plugins/graph/tf_graph_board:legacy",
        "//tensorboard/plugins/graph/tf_graph_controls:legacy",
        "//tensorboard/plugins/graph/tf_graph_loader:legacy",
    ],
)
