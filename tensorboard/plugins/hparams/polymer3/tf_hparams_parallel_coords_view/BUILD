load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_hparams_parallel_coords_view",
    srcs = [
        "tf-hparams-parallel-coords-view.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_parallel_coords_plot",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_scale_and_color_controls",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_session_group_details",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_session_group_values",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@vaadin/vaadin-split-layout",
    ],
)
