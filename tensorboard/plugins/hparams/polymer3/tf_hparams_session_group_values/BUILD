load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_hparams_session_group_values",
    srcs = [
        "tf-hparams-session-group-values.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_table_view",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_utils",
    ],
)
