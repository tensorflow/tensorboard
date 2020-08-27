load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_main",
    srcs = ["tf-hparams-main.ts"],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/plugins/hparams/tf_hparams_backend",
        "//tensorboard/plugins/hparams/tf_hparams_query_pane",
        "//tensorboard/plugins/hparams/tf_hparams_sessions_pane",
        "//tensorboard/plugins/hparams/tf_hparams_utils:hparams_split_layout",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
