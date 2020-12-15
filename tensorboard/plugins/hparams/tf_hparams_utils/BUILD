load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_utils",
    srcs = [
        "tf-hparams-utils.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
    ],
)

tf_ts_library(
    name = "hparams_split_layout",
    srcs = [
        "hparams-split-layout.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
