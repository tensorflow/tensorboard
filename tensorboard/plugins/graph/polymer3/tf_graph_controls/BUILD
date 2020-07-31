load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_controls",
    srcs = [
        "tf-graph-controls.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_node_search",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-radio-group",
        "@npm//@polymer/paper-toggle-button",
        "@npm//@polymer/paper-tooltip",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
