load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_node_search",
    srcs = ["tf-graph-node-search.ts"],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tb_debug",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/plugins/graph/tf_graph_common",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
