package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# `tf_web_library`/`tf_ts_library` here removed to facilitate internal
# sync-testing scripts.

dict(
    name = "tf_graph_loader",
    srcs = [
        "tf-graph-loader.html",
        "tf-graph-loader.ts",
    ],
    path = "/tf-graph-loader",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)

dict(
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
