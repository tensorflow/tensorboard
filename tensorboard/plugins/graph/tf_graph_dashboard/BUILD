load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_dashboard",
    srcs = ["tf-graph-dashboard.ts"],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/vz_sorting",
        "//tensorboard/plugins/graph/tf_graph",
        "//tensorboard/plugins/graph/tf_graph_board",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/graph/tf_graph_loader:tf_graph_dashboard_loader",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
