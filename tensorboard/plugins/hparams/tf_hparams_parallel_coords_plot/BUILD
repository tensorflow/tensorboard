load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_parallel_coords_plot",
    srcs = [
        "axes.ts",
        "interaction_manager.ts",
        "lines.ts",
        "tf-hparams-parallel-coords-plot.ts",
        "utils.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:dark_mode_mixin",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/plugins/hparams:types",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_values",
        "//tensorboard/plugins/hparams/tf_hparams_types",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
