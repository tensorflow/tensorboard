load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_scale_and_color_controls",
    srcs = [
        "tf-hparams-scale-and-color-controls.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:dom",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//d3",
    ],
)
