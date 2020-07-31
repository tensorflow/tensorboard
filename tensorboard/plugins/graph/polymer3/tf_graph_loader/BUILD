load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_loader",
    srcs = [
        "tf-graph-loader.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "@npm//@polymer/polymer",
        "@npm//@polymer/decorators",
    ],
)

tf_ts_library(
    name = "tf_graph_dashboard_loader",
    srcs = [
        "tf-graph-dashboard-loader.ts",
    ],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_controls",
        "@npm//@polymer/polymer",
        "@npm//@polymer/decorators",
    ],
)
