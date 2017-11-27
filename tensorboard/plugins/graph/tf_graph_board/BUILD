package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_board",
    srcs = ["tf-graph-board.html"],
    path = "/tf-graph-board",
    deps = [
        "//tensorboard/plugins/graph/tf_graph",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_info",
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_paper_progress",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_board"],
    destdir = "tf-graph-board",
    deps = [
        "//tensorboard/plugins/graph/tf_graph:legacy",
        "//tensorboard/plugins/graph/tf_graph_common:legacy",
        "//tensorboard/plugins/graph/tf_graph_info:legacy",
        "//third_party/javascript/polymer/v1/paper-progress:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

