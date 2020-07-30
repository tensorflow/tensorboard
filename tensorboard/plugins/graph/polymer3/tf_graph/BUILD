load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph",
    srcs = [
        "tf-graph.ts",
        "tf-graph-minimap.ts",
        "tf-graph-scene.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//@polymer/polymer",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-flex-layout",
        "@npm//@polymer/iron-icons",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-radio-group",
        "@npm//@polymer/paper-toggle-button",
        "@npm//@polymer/paper-tooltip",
    ],
)
