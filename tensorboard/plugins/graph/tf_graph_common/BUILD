package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_common",
    srcs = [
        "annotation.js",
        "colors.js",
        "common.js",
        "contextmenu.js",
        "edge.js",
        "externs.js",
        "graph.js",
        "hierarchy.js",
        "layout.js",
        "minimap.js",
        "node.js",
        "op.js",
        "parser.js",
        "proto.js",
        "render.js",
        "scene.js",
        "template.js",
        "tf-graph-common.html",
        "util.js",
    ],
    path = "/tf-graph-common",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:dagre",
        "//tensorboard/components/tf_imports:graphlib",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_common"],
    destdir = "tf-graph-common",
    deps = [
        "//tensorboard/components/tf_imports_google:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

