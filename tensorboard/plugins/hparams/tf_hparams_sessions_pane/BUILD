load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_sessions_pane",
    srcs = [
        "tf-hparams-sessions-pane.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/plugins/hparams/tf_hparams_parallel_coords_view",
        "//tensorboard/plugins/hparams/tf_hparams_scatter_plot_matrix_view",
        "//tensorboard/plugins/hparams/tf_hparams_table_view",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-pages",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-header-panel",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-tabs",
        "@npm//@polymer/paper-toolbar",
        "@npm//@polymer/polymer",
    ],
)
