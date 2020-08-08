package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# `tf_web_library`/`tf_ts_library` here removed to facilitate internal
# sync-testing scripts.

dict(
    name = "tf_graph_common",
    srcs = [
        "annotation.ts",
        "colors.ts",
        "common.ts",
        "contextmenu.ts",
        "edge.ts",
        "externs.ts",
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
        "tf-graph-common.html",
        "tf-graph-icon.html",
        "tf-graph-icon.ts",
        "tf-graph-scene.ts",
        "tf-node-icon.html",
        "util.ts",
    ],
    path = "/tf-graph-common",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:dagre",
        "//tensorboard/components/tf_imports:graphlib",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
    ],
)
