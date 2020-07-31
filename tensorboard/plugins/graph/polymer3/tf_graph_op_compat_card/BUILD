load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_op_compat_card",
    srcs = [
        "tf-graph-op-compat-card.ts",
        "tf-graph-op-compat-list-item.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@polymer/iron-collapse",
        "@npm//@polymer/iron-list",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-item",
    ],
)
