load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_debugger_data_card",
    srcs = [
        "tf-graph-debugger-data-card.ts",
    ],
    strict_checks = False,
    tags = ["manual"],
    deps = [
        "//tensorboard/components_polymer3/polymer:dom",
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
