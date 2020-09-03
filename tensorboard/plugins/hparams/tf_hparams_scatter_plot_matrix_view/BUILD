load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_scatter_plot_matrix_view",
    srcs = [
        "tf-hparams-scatter-plot-matrix-view.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/plugins/hparams/tf_hparams_scale_and_color_controls",
        "//tensorboard/plugins/hparams/tf_hparams_scatter_plot_matrix_plot",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_details",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_values",
        "//tensorboard/plugins/hparams/tf_hparams_utils:hparams_split_layout",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
