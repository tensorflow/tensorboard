load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_board",
    srcs = ["tf-graph-board.ts"],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/plugins/graph/tf_graph",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_info",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
