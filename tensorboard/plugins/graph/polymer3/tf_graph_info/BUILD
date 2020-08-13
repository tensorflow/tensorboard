load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_info",
    srcs = [
        "tf-graph-info.ts",
        "tf-node-info.ts",
        "tf-node-list-item.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:dom",
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_wbr_string",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_debugger_data_card",
        "//tensorboard/plugins/graph/polymer3/tf_graph_op_compat_card",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
