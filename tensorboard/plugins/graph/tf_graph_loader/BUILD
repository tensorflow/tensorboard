load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_loader",
    srcs = [
        "tf-graph-loader.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/plugins/graph/tf_graph_common",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
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
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
