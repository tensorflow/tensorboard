load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_info",
    srcs = [
        "tf-graph-info.ts",
        "tf-node-info.ts",
        "tf-node-list-item.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:dark_mode_mixin",
        "//tensorboard/components/polymer:dom",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_wbr_string",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_debugger_data_card",
        "//tensorboard/plugins/graph/tf_graph_op_compat_card",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
