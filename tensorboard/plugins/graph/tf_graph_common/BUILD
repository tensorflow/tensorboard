load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_common",
    srcs = [
        "colors.ts",
        "common.ts",
        "contextmenu.ts",
        "edge.ts",
        "graph.ts",
        "hierarchy.ts",
        "layout.ts",
        "loader.ts",
        "minimap.ts",
        "node.ts",
        "op.ts",
        "parser.ts",
        "proto.ts",
        "render.ts",
        "scene.ts",
        "template.ts",
        "tf-graph-icon.ts",
        "tf-graph-scene.ts",
        "tf-node-icon.ts",
        "util.ts",
    ],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/polymer:dom",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_dashboard_common",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//dagre",
        "@npm//lodash",
    ],
)
