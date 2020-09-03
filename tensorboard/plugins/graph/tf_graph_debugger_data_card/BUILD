load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_debugger_data_card",
    srcs = [
        "tf-graph-debugger-data-card.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:dom",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/plugins/graph/tf_graph_common",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
