load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_dashboard",
    srcs = ["tf-graph-dashboard.ts"],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_storage",
        "//tensorboard/components_polymer3/vz_sorting",
        "//tensorboard/plugins/graph/polymer3/tf_graph",
        "//tensorboard/plugins/graph/polymer3/tf_graph_board",
        "//tensorboard/plugins/graph/polymer3/tf_graph_common",
        "//tensorboard/plugins/graph/polymer3/tf_graph_controls",
        "//tensorboard/plugins/graph/polymer3/tf_graph_loader:tf_graph_dashboard_loader",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/polymer",
    ],
)
