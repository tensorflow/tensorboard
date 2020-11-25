load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_scatter_plot_matrix_plot",
    srcs = [
        "tf-hparams-scatter-plot-matrix-plot.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
    ],
)
